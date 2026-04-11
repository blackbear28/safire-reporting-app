import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing, ScrollView } from 'react-native';
import { styles } from '../styles';

// Trophy definitions with unlock criteria
export const TROPHIES = [
  {
    id: 'first_report',
    name: 'First Steps',
    description: 'Submit your first report',
    icon: '🌟',
    requirement: 1,
  },
  {
    id: 'reporter_5',
    name: 'Active Reporter',
    description: 'Submit 5 reports',
    icon: '🔥',
    requirement: 5,
  },
  {
    id: 'reporter_10',
    name: 'Dedicated Citizen',
    description: 'Submit 10 reports',
    icon: '💎',
    requirement: 10,
  },
  {
    id: 'reporter_25',
    name: 'Community Hero',
    description: 'Submit 25 reports',
    icon: '🏆',
    requirement: 25,
  },
  {
    id: 'reporter_50',
    name: 'Legend',
    description: 'Submit 50 reports',
    icon: '👑',
    requirement: 50,
  },
  {
    id: 'reporter_100',
    name: 'Champion',
    description: 'Submit 100 reports',
    icon: '⭐',
    requirement: 100,
  },
];

// Function to check which trophies should be unlocked
export const checkUnlockedTrophies = (reportsCount) => {
  return TROPHIES.filter(trophy => reportsCount >= trophy.requirement).map(t => t.id);
};

// Level system â€” aligns with trophy thresholds
const LEVELS = [
  { level: 1, min: 0,   nextMin: 5,   label: 'Newcomer',    color: '#94a3b8' },
  { level: 2, min: 5,   nextMin: 10,  label: 'Reporter',    color: '#22c55e' },
  { level: 3, min: 10,  nextMin: 25,  label: 'Contributor', color: '#3b82f6' },
  { level: 4, min: 25,  nextMin: 50,  label: 'Guardian',    color: '#8b5cf6' },
  { level: 5, min: 50,  nextMin: 100, label: 'Hero',        color: '#f59e0b' },
  { level: 6, min: 100, nextMin: null, label: 'Legend',     color: '#ef4444' },
];

const getLevelInfo = (reportsCount) => {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (reportsCount >= lvl.min) current = lvl;
    else break;
  }
  const isMax = current.nextMin === null;
  const progress = isMax
    ? 1
    : Math.min((reportsCount - current.min) / (current.nextMin - current.min), 1);
  return { ...current, isMax, progress };
};

// Animated Trophy Icon Component
export const AnimatedTrophyIcon = ({ isUnlocked, icon, size = 40 }) => {
  const scaleAnim = useRef(new Animated.Value(isUnlocked ? 1 : 0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isUnlocked) {
      // Scale and rotate animation when unlocked
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isUnlocked]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.Text
      style={[
        styles.trophyIcon,
        !isUnlocked && styles.trophyIconLocked,
        {
          transform: [{ scale: scaleAnim }],
          fontSize: size,
        },
      ]}
    >
      {icon}
    </Animated.Text>
  );
};

// Trophy Display Component
export const TrophyDisplay = ({ reportsCount, userTrophies = [], colors, isDarkMode }) => {
  const unlockedTrophies = checkUnlockedTrophies(reportsCount);
  const [showNewBadge, setShowNewBadge] = useState({});

  // Fallback colors for when used outside AccountTab
  const c = colors || {
    surface: '#ffffff',
    background: '#f5f5f5',
    text: '#1a1a1a',
    textSecondary: '#666666',
    border: '#e5e7eb',
  };

  const levelInfo = getLevelInfo(reportsCount);
  const dark = isDarkMode || false;

  useEffect(() => {
    const newTrophies = unlockedTrophies.filter(id => !userTrophies.includes(id));
    if (newTrophies.length > 0) {
      const badges = {};
      newTrophies.forEach(id => { badges[id] = true; });
      setShowNewBadge(badges);
      setTimeout(() => setShowNewBadge({}), 5000);
    }
  }, [reportsCount]);

  return (
    <View>
      {/* â”€â”€ Section label â”€â”€ */}
      <Text style={{
        fontFamily: 'Outfit-Bold',
        fontSize: 12,
        color: c.textSecondary,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: 10,
      }}>
        Achievements
      </Text>

      {/* â”€â”€ Level / XP card â”€â”€ */}
      <View style={{
        backgroundColor: c.surface,
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: c.border,
      }}>
        {/* Level row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <View style={{
            backgroundColor: levelInfo.color,
            borderRadius: 20,
            paddingHorizontal: 9,
            paddingVertical: 3,
            marginRight: 8,
          }}>
            <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 10, color: '#fff', letterSpacing: 0.5 }}>
              LVL {levelInfo.level}
            </Text>
          </View>
          <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 15, color: c.text, flex: 1 }}>
            {levelInfo.label}
          </Text>
          <Text style={{ fontFamily: 'Outfit-Regular', fontSize: 11, color: c.textSecondary }}>
            {levelInfo.isMax ? '🔥 Max Level' : `${reportsCount} / ${levelInfo.nextMin}`}
          </Text>
        </View>

        {/* XP progress bar */}
        <View style={{
          height: 7,
          backgroundColor: dark ? '#334155' : '#e2e8f0',
          borderRadius: 4,
          overflow: 'hidden',
        }}>
          <View style={{
            height: 7,
            width: `${Math.round(levelInfo.progress * 100)}%`,
            backgroundColor: levelInfo.color,
            borderRadius: 4,
          }} />
        </View>

        {/* Sub-labels */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          <Text style={{ fontFamily: 'Outfit-Regular', fontSize: 10, color: c.textSecondary }}>
            {unlockedTrophies.length} / {TROPHIES.length} trophies earned
          </Text>
          {!levelInfo.isMax && (
            <Text style={{ fontFamily: 'Outfit-Regular', fontSize: 10, color: c.textSecondary }}>
              {levelInfo.nextMin - reportsCount} more to level {levelInfo.level + 1}
            </Text>
          )}
        </View>
      </View>

      {/* â”€â”€ Trophy horizontal scroll â”€â”€ */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -16 }}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
      >
        {TROPHIES.map((trophy) => {
          const isUnlocked = unlockedTrophies.includes(trophy.id);
          const isNew = showNewBadge[trophy.id];
          const progress = Math.min(reportsCount / trophy.requirement, 1);

          return (
            <View key={trophy.id} style={{
              width: 84,
              alignItems: 'center',
              backgroundColor: isUnlocked
                ? (dark ? '#1e1b10' : '#fffbeb')
                : (dark ? '#1e293b' : '#f8fafc'),
              borderRadius: 14,
              paddingVertical: 12,
              paddingHorizontal: 8,
              borderWidth: 1.5,
              borderColor: isUnlocked
                ? levelInfo.color + 'aa'
                : (dark ? '#334155' : '#e2e8f0'),
            }}>
              {/* NEW badge */}
              {isNew && (
                <View style={{
                  position: 'absolute', top: -6, right: -6,
                  backgroundColor: '#ef4444', borderRadius: 8,
                  paddingHorizontal: 5, paddingVertical: 2, zIndex: 10,
                }}>
                  <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 8, color: '#fff' }}>NEW</Text>
                </View>
              )}

              {/* Icon circle */}
              <View style={{
                width: 48, height: 48, borderRadius: 24,
                backgroundColor: isUnlocked
                  ? levelInfo.color + '28'
                  : (dark ? '#334155' : '#e2e8f0'),
                alignItems: 'center', justifyContent: 'center',
                marginBottom: 7,
              }}>
                <Text style={{ fontSize: 22, opacity: isUnlocked ? 1 : 0.3 }}>
                  {trophy.icon}
                </Text>
                {!isUnlocked && (
                  <View style={{
                    position: 'absolute', bottom: -2, right: -2,
                    backgroundColor: dark ? '#475569' : '#94a3b8',
                    borderRadius: 7, width: 14, height: 14,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 8 }}>🔒</Text>
                  </View>
                )}
              </View>

              {/* Name */}
              <Text
                numberOfLines={2}
                style={{
                  fontFamily: 'Outfit-SemiBold', fontSize: 10,
                  color: isUnlocked ? c.text : c.textSecondary,
                  textAlign: 'center', marginBottom: 6, lineHeight: 13,
                }}
              >
                {trophy.name}
              </Text>

              {/* State indicator */}
              {isUnlocked ? (
                <View style={{
                  backgroundColor: levelInfo.color,
                  borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2,
                }}>
                  <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 9, color: '#fff' }}>âœ“ Earned</Text>
                </View>
              ) : (
                <View style={{ width: '100%' }}>
                  <View style={{
                    height: 4, backgroundColor: dark ? '#334155' : '#e2e8f0',
                    borderRadius: 2, overflow: 'hidden',
                  }}>
                    <View style={{
                      height: 4,
                      width: `${Math.round(progress * 100)}%`,
                      backgroundColor: '#3b82f6',
                      borderRadius: 2,
                    }} />
                  </View>
                  <Text style={{
                    fontFamily: 'Outfit-Regular', fontSize: 9,
                    color: c.textSecondary, textAlign: 'center', marginTop: 3,
                  }}>
                    {reportsCount}/{trophy.requirement}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

// Trophy notification when earned
export const TrophyUnlockedNotification = ({ trophy, onClose }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-hide after 4 seconds
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (onClose) onClose();
      });
    }, 4000);
  }, []);

  if (!trophy) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 50,
        left: 20,
        right: 20,
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 12,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
        zIndex: 1000,
      }}
    >
      <Text
        style={{
          fontFamily: 'Outfit-Bold',
          fontSize: 18,
          color: '#2667ff',
          marginBottom: 10,
          textAlign: 'center',
        }}
      >
        🎉 Trophy Unlocked!
      </Text>
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 60, marginBottom: 10 }}>{trophy.icon}</Text>
        <Text
          style={{
            fontFamily: 'Outfit-Bold',
            fontSize: 16,
            color: '#333',
            marginBottom: 5,
          }}
        >
          {trophy.name}
        </Text>
        <Text
          style={{
            fontFamily: 'Outfit-Regular',
            fontSize: 14,
            color: '#666',
            textAlign: 'center',
          }}
        >
          {trophy.description}
        </Text>
      </View>
    </Animated.View>
  );
};
