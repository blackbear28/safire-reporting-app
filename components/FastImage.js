// Lightweight Image Component Optimized for Scrolling Performance
// Designed specifically to not interfere with scroll performance

import React, { memo, useState } from 'react';
import { Image, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Lightweight image component that prioritizes scroll performance
 * Key optimizations:
 * - No progressive loading during scroll
 * - Minimal state updates
 * - Fast fallbacks
 * - Memory efficient
 */
const FastImage = memo(({ 
  source, 
  style, 
  category = 'default',
  resizeMode = 'cover'
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Fast error handling - no retries to avoid blocking
  const handleError = () => {
    try {
      if (!hasError) {
        setHasError(true);
      }
    } catch (error) {
      // Silently handle any state update errors
    }
  };

  const handleLoad = () => {
    try {
      if (!isLoaded) {
        setIsLoaded(true);
      }
    } catch (error) {
      // Silently handle any state update errors
    }
  };

  // Fast fallback for performance
  if (hasError || !source?.uri) {
    return (
      <View style={[style, styles.fallbackContainer]}>
        <Ionicons 
          name="image-outline" 
          size={20} 
          color="#ccc" 
        />
      </View>
    );
  }

  return (
    <View style={style}>
      <Image
        source={source}
        style={[style, styles.image]}
        resizeMode={resizeMode}
        onError={handleError}
        onLoad={handleLoad}
        // Performance optimizations
        {...(Platform.OS === 'ios' && {
          removeClippedSubviews: true,
          shouldRasterizeIOS: true,
          renderToHardwareTextureAndroid: true
        })}
      />
    </View>
  );
});

const styles = {
  image: {
    width: '100%',
    height: '100%',
  },
  fallbackContainer: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  }
};

FastImage.displayName = 'FastImage';

export default FastImage;
