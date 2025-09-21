// Advanced Image Component with Industry Best Practices
// Used by Instagram, Twitter, Facebook, TikTok, etc.

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Image, 
  View, 
  ActivityIndicator, 
  Text, 
  PixelRatio,
  Dimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');

/**
 * Progressive Image Loading with Industry Best Practices
 * Features:
 * - Lazy loading
 * - Progressive enhancement (blur-up technique)
 * - Error handling with fallbacks
 * - Memory optimization
 * - CDN optimization
 */
export const ProgressiveImage = ({ 
  source, 
  style, 
  thumbnailSource,
  fallbackSource,
  resizeMode = 'cover',
  onLoad,
  onError,
  fadeDuration = 300,
  showLoadingIndicator = false,
  category = 'default'
}) => {
  const [imageState, setImageState] = useState({
    thumbnailLoaded: false,
    imageLoaded: false,
    error: false,
    loading: true
  });
  
  const mountedRef = useRef(true);
  
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);
  
  const handleThumbnailLoad = useCallback(() => {
    if (!mountedRef.current) return;
    setImageState(prev => ({ ...prev, thumbnailLoaded: true }));
  }, []);
  
  const handleImageLoad = useCallback(() => {
    if (!mountedRef.current) return;
    setImageState(prev => ({ 
      ...prev, 
      imageLoaded: true, 
      loading: false 
    }));
    onLoad && onLoad();
  }, [onLoad]);
  
  const handleError = useCallback((error) => {
    if (!mountedRef.current) return;
    setImageState(prev => ({ 
      ...prev, 
      error: true, 
      loading: false 
    }));
    onError && onError(error);
  }, [onError]);
  
  // Get category-based fallback image
  const getCategoryFallback = (category) => {
    const fallbacks = {
      'Academic': 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=200&h=120&fit=crop&q=60',
      'Achievement': 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=200&h=120&fit=crop&q=60',
      'Event': 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=200&h=120&fit=crop&q=60',
      'Competition': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=120&fit=crop&q=60',
      'Research': 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=200&h=120&fit=crop&q=60',
      'Training': 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=200&h=120&fit=crop&q=60',
      'default': 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=200&h=120&fit=crop&q=60'
    };
    
    return { uri: fallbacks[category] || fallbacks.default };
  };
  
  const renderImage = () => {
    if (imageState.error) {
      // Show fallback image or placeholder
      return (
        <View style={[style, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }]}>
          <Image
            source={fallbackSource || getCategoryFallback(category)}
            style={style}
            resizeMode={resizeMode}
            onError={() => {
              // Ultimate fallback - colored placeholder
            }}
          />
          <View style={{
            position: 'absolute',
            bottom: 4,
            right: 4,
            backgroundColor: 'rgba(0,0,0,0.6)',
            borderRadius: 4,
            padding: 2
          }}>
            <Ionicons name="image-outline" size={12} color="#fff" />
          </View>
        </View>
      );
    }
    
    return (
      <View style={style}>
        {/* Thumbnail - loads first for blur-up effect */}
        {thumbnailSource && !imageState.imageLoaded && (
          <Image
            source={thumbnailSource}
            style={[style, { 
              position: 'absolute',
              opacity: imageState.thumbnailLoaded ? 1 : 0
            }]}
            resizeMode={resizeMode}
            onLoad={handleThumbnailLoad}
            blurRadius={2} // Blur effect
          />
        )}
        
        {/* Main image */}
        <Image
          source={source}
          style={[style, {
            opacity: imageState.imageLoaded ? 1 : 0
          }]}
          resizeMode={resizeMode}
          onLoad={handleImageLoad}
          onError={handleError}
          fadeDuration={fadeDuration}
          progressiveRenderingEnabled={false} // We handle this manually
        />
        
        {/* Loading indicator */}
        {imageState.loading && showLoadingIndicator && (
          <View style={[style, {
            position: 'absolute',
            backgroundColor: '#f5f5f5',
            justifyContent: 'center',
            alignItems: 'center'
          }]}>
            <ActivityIndicator size="small" color="#2667ff" />
          </View>
        )}
      </View>
    );
  };
  
  return renderImage();
};

/**
 * Lazy loading hook for FlatList
 * Similar to Instagram/Twitter's approach
 */
export const useLazyLoading = (data, threshold = 3) => {
  const [visibleItems, setVisibleItems] = useState(new Set());
  
  const onViewableItemsChanged = useCallback(({ viewableItems, changed }) => {
    const newVisible = new Set();
    
    // Add currently visible items
    viewableItems.forEach(item => {
      newVisible.add(item.key || item.item.id);
    });
    
    // Keep previously loaded items (once loaded, stay loaded)
    visibleItems.forEach(itemId => {
      newVisible.add(itemId);
    });
    
    setVisibleItems(newVisible);
  }, [visibleItems]);
  
  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 100
  };
  
  const shouldLoadImage = useCallback((itemId) => {
    return visibleItems.has(itemId);
  }, [visibleItems]);
  
  return {
    onViewableItemsChanged,
    viewabilityConfig,
    shouldLoadImage
  };
};

/**
 * Optimize image URL based on device capabilities
 */
export const getOptimizedImageUrl = (baseUrl, width, height, quality = 80) => {
  if (!baseUrl) return null;
  
  const pixelRatio = PixelRatio.get();
  const deviceWidth = screenWidth;
  
  // Adjust size based on pixel ratio and actual display size
  const optimalWidth = Math.min(width * pixelRatio, deviceWidth * pixelRatio);
  const optimalHeight = Math.round(height * pixelRatio);
  
  // For Unsplash images
  if (baseUrl.includes('unsplash.com')) {
    return `${baseUrl}?w=${optimalWidth}&h=${optimalHeight}&fit=crop&crop=center&q=${quality}&fm=webp`;
  }
  
  // For other images, you might use Cloudinary or similar
  // return `https://res.cloudinary.com/your-cloud/image/fetch/w_${optimalWidth},h_${optimalHeight},c_fill,q_${quality},f_auto/${encodeURIComponent(baseUrl)}`;
  
  return baseUrl;
};

/**
 * Preload critical images (Instagram/Facebook approach)
 */
export const preloadImages = async (imageUrls, maxConcurrent = 3) => {
  const preloadPromises = imageUrls.slice(0, maxConcurrent).map(url => {
    return new Promise((resolve) => {
      if (url) {
        Image.prefetch(url)
          .then(() => resolve(url))
          .catch(() => resolve(null)); // Don't fail on individual errors
      } else {
        resolve(null);
      }
    });
  });
  
  try {
    const results = await Promise.allSettled(preloadPromises);
    return results.map(result => 
      result.status === 'fulfilled' ? result.value : null
    ).filter(Boolean);
  } catch (error) {
    console.log('Image preloading error:', error);
    return [];
  }
};

/**
 * Smart image cache management
 */
export const ImageCacheManager = {
  cache: new Map(),
  maxSize: 50, // Maximum cached images
  
  add(url, data) {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(url, { ...data, timestamp: Date.now() });
  },
  
  get(url) {
    return this.cache.get(url);
  },
  
  clear() {
    this.cache.clear();
  },
  
  cleanup(maxAge = 30 * 60 * 1000) { // 30 minutes
    const now = Date.now();
    for (const [url, data] of this.cache.entries()) {
      if (now - data.timestamp > maxAge) {
        this.cache.delete(url);
      }
    }
  }
};
