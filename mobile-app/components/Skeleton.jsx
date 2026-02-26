import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';

export default function Skeleton({ variant = 'text', style }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);

  const getVariantStyle = () => {
    switch (variant) {
      case 'title':
        return { width: '70%', height: 28, borderRadius: 8, marginBottom: 8 };
      case 'subtitle':
        return { width: '50%', height: 16, borderRadius: 4, marginBottom: 8 };
      case 'text':
        return { width: '30%', height: 14, borderRadius: 4 };
      case 'avatar':
        return { width: 60, height: 60, borderRadius: 30 }; 
      default:
        return { width: '100%', height: 20, borderRadius: 4 };
    }
  };

  return (
    <Animated.View
      style={[
        styles.skeleton,
        getVariantStyle(), 
        style 
      ]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E5E7EB',
  }
});