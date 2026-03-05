import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import AppText from '../../../../components/AppText';
import AnimatedWrapper from '../../../../components/AnimatedWrapper';
import { Colors } from '../../../../constants/Color';

export default function ServicesTab({ services, branchId }) {
  const router = useRouter();

  if (!services || services.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="medical-outline" size={48} color="#D1D5DB" style={{ marginBottom: 12 }} />
        <AppText style={styles.emptyTitle}>No Services Available</AppText>
        <AppText style={styles.emptySubtitle}>This clinic has not listed any services yet.</AppText>
      </View>
    );
  }

  const handleBookService = (branchServiceId) => {
    router.push({
      pathname: `/(dashboard)/clinics/BookAppointment`,
      params: { branch_id: branchId, branch_service_id: branchServiceId }
    });
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      {services.map((item, index) => (
        <AnimatedWrapper key={item.branch_service_id || index} index={index}>
          <Pressable 
            style={({ pressed }) => [
              styles.serviceCard,
              pressed && styles.serviceCardPressed
            ]}
            onPress={() => handleBookService(item.branch_service_id)}
          >
            {({ pressed }) => (
              <View style={styles.cardInner}>
                <View style={styles.textContainer}>
                  
                  <AppText style={styles.serviceName}>
                    {item.service_name}
                  </AppText>
                  
                  {item.description ? (
                    <AppText style={styles.serviceDescription} numberOfLines={2}>
                      {item.description}
                    </AppText>
                  ) : null}

                  <View style={styles.metaRow}>
                    <View style={styles.metaBadge}>
                      <Ionicons name="time-outline" size={14} color="#3B82F6" />
                      <AppText style={[styles.metaText, { color: '#3B82F6' }]}>{item.duration} mins</AppText>
                    </View>
                    
                    <View style={styles.metaBadge}>
                      <Ionicons name="cash-outline" size={14} color="#10B981" />
                      <AppText style={[styles.metaText, { color: Colors.primary }]}>₱{parseFloat(item.price).toFixed(2)}</AppText>
                    </View>
                  </View>
                </View>

                <View style={[styles.bookBtn, pressed && { backgroundColor: Colors.primary }]}>
                  <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                </View>
              </View>
            )}
          </Pressable>
        </AnimatedWrapper>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center' },

  serviceCard: { backgroundColor: Colors.white, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  serviceCardPressed: { borderColor: Colors.primary }, 
  
  cardInner: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  textContainer: { flex: 1, paddingRight: 16 },
  
  serviceName: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6, textTransform: 'capitalize' },
  serviceDescription: { fontSize: 13, color: '#6B7280', lineHeight: 20, marginBottom: 12 },
  
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  metaText: { fontSize: 13, fontWeight: '700' },

  bookBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' }
});