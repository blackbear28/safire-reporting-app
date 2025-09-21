/**
 * Safe navigation fallback for when gesture handler fails
 * This provides basic navigation without gesture dependencies
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function SafeNavigationFallback({ onRetry }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="warning-outline" size={64} color="#ff6b6b" />
        <Text style={styles.title}>Navigation System Error</Text>
        <Text style={styles.description}>
          The app's navigation system encountered an error. This is likely due to a missing native module.
        </Text>
        <Text style={styles.technicalInfo}>
          Error: RNGestureHandlerModule could not be found
        </Text>
        
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
          
          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>What to do:</Text>
            <Text style={styles.infoText}>1. Close the app completely</Text>
            <Text style={styles.infoText}>2. Restart your device</Text>
            <Text style={styles.infoText}>3. Try opening the app again</Text>
            <Text style={styles.infoText}>4. If the issue persists, reinstall the app</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 15,
  },
  technicalInfo: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 30,
  },
  actionContainer: {
    width: '100%',
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#2667ff',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 30,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoContainer: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 10,
    width: '100%',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    lineHeight: 20,
  },
});
