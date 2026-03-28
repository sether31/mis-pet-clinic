import React, { useState, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, RefreshControl, Image, ActivityIndicator, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Color';
import { authFetch } from '../../../utils/auth';

// Components
import AppText from '../../../components/AppText';
import AppButton from '../../../components/AppButton';
import AnimatedWrapper from '../../../components/AnimatedWrapper';

const PLACEHOLDER_IMAGE = require('../../../assets/images/no-image.jpg');
const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function PetsIndex() {
  const router = useRouter();
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pressedId, setPressedId] = useState(null);

  const fetchPets = async () => {
    try {
      const data = await authFetch(`${API_URL}/api/pet-owner/pet/get-pets.php`);
      if (data?.success) {
        setPets(data.data);
      }
    } catch (error) {
      console.error("Error fetching pets:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPets();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchPets();
  };

  const getPetImageSource = (path) => {
    if (path && typeof path === 'string' && path.trim() !== "") {
      const cleanPath = path.startsWith('/') ? path.substring(1) : path;
      const cleanApi = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
      return { uri: `${cleanApi}/${cleanPath}` };
    }
    return PLACEHOLDER_IMAGE;
  };

  // 👇 NEW: Age Calculation Function
  const calculateAge = (birthdate, isDeceased, deceasedDate) => {
    if (!birthdate) return '';
    
    const start = new Date(birthdate);
    // If deceased, calculate age at time of death. Otherwise, use today.
    const end = (parseInt(isDeceased) === 1 && deceasedDate) ? new Date(deceasedDate) : new Date();
    
    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    
    // Adjust if the month hasn't been reached yet in the current year
    if (months < 0 || (months === 0 && end.getDate() < start.getDate())) {
      years--;
      months += 12;
    }
    
    if (years > 0) return `${years} yr${years > 1 ? 's' : ''}`;
    if (months > 0) return `${months} mo${months > 1 ? 's' : ''}`;
    return '< 1 mo';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <AppText style={styles.headerTitle}>My Pets</AppText>
        <View style={styles.headerActions}>
          <Pressable 
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.addButtonPressed]} 
            onPress={() => router.push('/pets/Archive')}
          >
            <Ionicons name="archive-outline" size={20} color={Colors.primary} />
          </Pressable>

          <Pressable 
            style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]} 
            onPress={() => router.push('/pets/Create')}
          >
            <Ionicons name="add" size={24} color="#FFF" />
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : pets.length === 0 ? (
        <ScrollView 
          contentContainerStyle={styles.emptyContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <AnimatedWrapper index={0} style={styles.emptyIconWrapper}>
            <Ionicons name="paw" size={80} color="#E5E7EB" />
          </AnimatedWrapper>
          <AppText style={styles.emptyTitle}>No Pets Yet</AppText>
          <AppText style={styles.emptySubtitle}>
            Add your first pet to start tracking their medical records.
          </AppText>
          <AppButton 
            style={{ marginTop: 30, paddingVertical: 16, paddingHorizontal: 32 }}
            title="Add Pet" 
            onPress={() => router.push('/pets/Create')} 
          />
        </ScrollView>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
          {pets.map((pet, index) => {
            // Calculate the string for age
            const ageString = calculateAge(pet.birthdate, pet.is_deceased, pet.deceased_date);

            return (
              <AnimatedWrapper key={pet.pet_id} index={index}>
                <TouchableOpacity 
                  activeOpacity={1}
                  onPressIn={() => setPressedId(pet.pet_id)}
                  onPressOut={() => setPressedId(null)}
                  onPress={() => router.push(`/pets/${pet.pet_id}`)}
                  style={[styles.petCard, pressedId === pet.pet_id && { borderColor: Colors.primary }]}
                >
                  <View style={styles.petCardInner}>
                    <View style={styles.petImageContainer}>
                      <Image source={getPetImageSource(pet.pet_picture)} style={styles.petImage} resizeMode="cover" />
                    </View>
                    <View style={styles.petDetails}>
                      <View style={styles.petHeaderRow}>
                        <AppText numberOfLines={1} style={styles.petName}>{pet.name}</AppText>
                        {parseInt(pet.is_deceased) === 1 && <AppText style={{marginLeft: 4}}>🌈</AppText>}
                        <Ionicons 
                          name={pet.sex === 'Male' ? "male" : "female"} 
                          size={14} 
                          color={pet.sex === 'Male' ? "#3B82F6" : "#EC4899"} 
                          style={{ marginLeft: 6 }} 
                        />
                      </View>
                      
                      {/* 👇 UPDATED: Added age to the bottom string */}
                      <AppText numberOfLines={1} style={styles.petBreed}>
                        {pet.breed} • {pet.species} {ageString ? `• ${ageString}` : ''}
                      </AppText>

                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
                  </View>
                </TouchableOpacity>
              </AnimatedWrapper>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg50 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 10 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#111827' },
  headerActions: { flexDirection: 'row', gap: 10 },
  addButton: { backgroundColor: Colors.primary, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  secondaryButton: { backgroundColor: '#FFF', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  addButtonPressed: { opacity: 0.7, transform: [{ scale: 0.95 }] },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyIconWrapper: { width: 140, height: 140, backgroundColor: '#F3F4F6', borderRadius: 70, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 12 },
  emptySubtitle: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
  listContainer: { padding: 20 },
  petCard: { backgroundColor: Colors.white, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  petCardInner: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  petImageContainer: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#F3F4F6', marginRight: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  petImage: { width: '100%', height: '100%' },
  petDetails: { flex: 1 },
  petHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  petName: { fontSize: 18, fontWeight: '800', color: '#111827', textTransform: 'capitalize' },
  petBreed: { fontSize: 14, color: '#6B7280', fontWeight: '500', textTransform: 'capitalize' }
});