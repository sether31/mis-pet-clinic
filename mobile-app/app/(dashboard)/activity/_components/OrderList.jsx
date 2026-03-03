import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from '../../../../components/AppText';

export default function OrdersList({ activeTab }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="cart-outline" size={60} color="#E5E7EB" />
      <AppText style={styles.emptyTitle}>No Product Orders Yet</AppText>
      <AppText style={styles.emptySub}>
        Your {activeTab} reserved items and medications will appear here.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#4B5563', marginTop: 16 },
  emptySub: { fontSize: 14, color: '#9CA3AF', marginTop: 4, textAlign: 'center', paddingHorizontal: 40 },
});