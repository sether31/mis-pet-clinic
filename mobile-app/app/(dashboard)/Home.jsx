import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppText from '../../components/AppText';
import { Colors } from '../../constants/Color';

export default function Home() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        
        <View style={styles.welcomeSection}>
          <AppText style={styles.welcomeText}>Hello, User! 👋</AppText>
          <AppText style={styles.subText}>How is your pet doing today?</AppText>
        </View>

        {/* This is where you will later map your clinic data or appointments */}
        <View style={styles.card}>
          <AppText style={styles.cardTitle}>Upcoming Appointments</AppText>
          <AppText style={styles.emptyText}>No appointments scheduled.</AppText>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg50 },
  content: { padding: 20 },
  welcomeSection: { marginBottom: 30 },
  welcomeText: { fontSize: 24, fontWeight: '900', color: Colors.dark },
  subText: { fontSize: 16, color: '#6B7280', marginTop: 4 },
  card: {
    backgroundColor: Colors.white,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  emptyText: { color: '#9CA3AF', fontStyle: 'italic' }
});