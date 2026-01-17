import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
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
export const TrophyDisplay = ({ reportsCount, userTrophies = [] }) => {
  const unlockedTrophies = checkUnlockedTrophies(reportsCount);
  const [showNewBadge, setShowNewBadge] = useState({});

  useEffect(() => {
    // Check for newly unlocked trophies
    const newTrophies = unlockedTrophies.filter(id => !userTrophies.includes(id));
    if (newTrophies.length > 0) {
      const badges = {};
      newTrophies.forEach(id => {
        badges[id] = true;
      });
      setShowNewBadge(badges);

      // Hide badges after 5 seconds
      setTimeout(() => {
        setShowNewBadge({});
      }, 5000);
    }
  }, [reportsCount]);

  return (
    <View style={styles.trophyContainer}>
      <View style={styles.trophyHeader}>
        <Text style={styles.trophyTitle}>🏆 Your Trophies</Text>
      </View>

      {/* Report Stats Card */}
      <View style={styles.reportStatsCard}>
        <View style={styles.reportStatsLeft}>
          <Text style={styles.reportStatsTitle}>Total Reports</Text>
          <Text style={styles.reportStatsValue}>{reportsCount}</Text>
        </View>
        <Text style={styles.reportStatsIcon}>📊</Text>
      </View>

      {/* Trophy Grid */}
      <View style={styles.trophyGrid}>
        {TROPHIES.map((trophy) => {
          const isUnlocked = unlockedTrophies.includes(trophy.id);
          const isNew = showNewBadge[trophy.id];
          
          return (
            <View
              key={trophy.id}
              style={[
                styles.trophyItem,
                isUnlocked && styles.trophyItemUnlocked,
              ]}
            >
              {isNew && (
                <View style={styles.trophyBadge}>
                  <Text style={styles.trophyBadgeText}>NEW!</Text>
                </View>
              )}
              <AnimatedTrophyIcon
                isUnlocked={isUnlocked}
                icon={trophy.icon}
              />
              <Text style={styles.trophyName}>{trophy.name}</Text>
              <Text style={styles.trophyDescription}>{trophy.description}</Text>
              {!isUnlocked && (
                <Text style={styles.trophyProgress}>
                  {reportsCount}/{trophy.requirement}
                </Text>
              )}
            </View>
          );
        })}
      </View>
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
