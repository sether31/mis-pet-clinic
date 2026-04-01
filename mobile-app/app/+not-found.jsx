import React from 'react';
import { View, StyleSheet, Image, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';

import AppText from '../components/AppText';
import { Colors } from '../constants/Color';
import { useUser } from '../hooks/useUser';

const NOT_FOUND_GIF = require('../assets/images/notFound.gif');

export default function NotFoundScreen() {
  const router = useRouter();
  const { user } = useUser(); 

  const handleGoHome = () => {
    if (user) {
      router.replace('/(dashboard)/home');
    } else {
      router.replace('/(auth)/Login');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View 
        entering={FadeInUp.duration(600).springify()} 
        style={styles.content}
      >
        {/* Image & 404 Badge Wrapper */}
        <View style={styles.imageContainer}>
          <Image 
            source={NOT_FOUND_GIF} 
            style={styles.image}
            resizeMode="cover"
          />
          
          <View style={styles.badge}>
            <AppText style={styles.badgeText}>404</AppText>
          </View>
        </View>

        {/* Text Section */}
        <AppText style={styles.title}>Lost in the Clinic?</AppText>
        <AppText style={styles.subtitle}>
          The page you’re looking for doesn’t exist.
        </AppText>

        {/* Button */}
        <Pressable 
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed
          ]}
          onPress={handleGoHome}
        >
          <AppText style={styles.buttonText}>Back to Home</AppText>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', 
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 40,
  },
  image: {
    width: 300,
    height: 300,
    borderRadius: 24,
    opacity: 0.8, 
  },
  badge: {
    position: 'absolute',
    bottom: -15,
    right: -15,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    transform: [{ rotate: '12deg' }],
    // Shadow for Mobile
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    elevation: 2,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
});