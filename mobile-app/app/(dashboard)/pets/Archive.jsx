import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Color';
import { authFetch } from '../../../utils/auth';
import Toast from 'react-native-toast-message';

// Components
import AppText from '../../../components/AppText';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function PetArchive() {
  const router = useRouter();
  const [archivedPets, setArchivedPets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArchivedPets();
  }, []);

  const fetchArchivedPets = async () => {
    try {
      // Create a small PHP file for this or add a ?type=archived flag to get-pets.php
      const data = await authFetch(`${API_URL}/api/pet-owner/pet/get-pets.php?archived=1`);
      if (data?.success) setArchivedPets(data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = (pet) => {
    Alert.alert(
      "Restore Pet Profile?",
      `Do you want to move ${pet.name} back to your active list?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Restore", 
          onPress: async () => {
            const res = await authFetch(`${API_URL}/api/pet-owner/pet/update-pet-status.php`, {
              method: 'POST',
              body: JSON.stringify({ pet_id: pet.pet_id, action: 'restore' })
            });
            if (res?.success) {
              Toast.show({ type: 'success', text1: 'Restored!', text2: `${pet.name} is back in your pet list.` });
              fetchArchivedPets();
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <AppText style={styles.headerTitle}>Archives</AppText>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} />
      ) : archivedPets.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="archive-outline" size={60} color="#E5E7EB" />
          <AppText style={styles.emptyText}>No archived pets found.</AppText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {archivedPets.map((pet) => (
            <View key={pet.pet_id} style={styles.archiveCard}>
              <AppText style={styles.petName}>{pet.name}</AppText>
              <TouchableOpacity style={styles.restoreBtn} onPress={() => handleRestore(pet)}>
                <Ionicons name="refresh-outline" size={18} color={Colors.primary} />
                <AppText style={styles.restoreText}>Restore</AppText>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg50 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 24 },
  backButton: { marginRight: 16 },
  headerTitle: { fontSize: 24, fontWeight: '900' },
  list: { padding: 20 },
  archiveCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  petName: { fontSize: 16, fontWeight: '800', color: '#111827' },
  restoreBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F9FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  restoreText: { color: Colors.primary, fontWeight: '900', fontSize: 12, marginLeft: 4 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', opacity: 0.5 }
});