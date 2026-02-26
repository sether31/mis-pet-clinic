import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

export default function AnimatedWrapper({ children, index = 0, style }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current; 

  useEffect(() => {
    // Index 0 waits 0ms, Index 1 waits 100ms, Index 2 waits 200ms...
    const delayTime = index * 100; 

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: delayTime, 
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: delayTime,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  return (
    <Animated.View style={[style, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {children}
    </Animated.View>
  );
}