import React, { useState, useCallback } from 'react'; 
import { View, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router'; 
import * as SecureStore from 'expo-secure-store';

import AppText from '../../../components/AppText';
import AnimatedWrapper from '../../../components/AnimatedWrapper';
import { authFetch } from '../../../utils/auth';
import { useUser } from '../../../hooks/useUser'; 
import { Colors } from '../../../constants/Color';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const DEFAULT_IMAGE = require('../../../assets/images/no-image.jpg'); 

export default function ProfileTab() {
  const router = useRouter();
  const { user, setUser } = useUser(); 
  
  const [loadingPets, setLoadingPets] = useState(true);
  const [petCount, setPetCount] = useState(0); 

  useFocusEffect(
    useCallback(() => {
      fetchMyPets();
    }, [])
  );

  const fetchMyPets = async () => {
    setLoadingPets(true);
    try {
      const res = await authFetch(`${API_URL}/api/pet-owner/pet/get-pets.php`);
      if (res?.success) {
        setPetCount(res.data.length); 
      }
    } catch (error) {
      console.error("Failed to load pets:", error);
    } finally {
      setLoadingPets(false);
    }
  };

  const getMediaUrl = (path) => {
    if (!path || path.trim() === '') return null;
    if (path.startsWith('http')) return path; 
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${API_URL}/${cleanPath}`;
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout", "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Yes, Logout", style: "destructive",
          onPress: async () => {
            await SecureStore.deleteItemAsync('access_token');
            if (setUser) setUser(null); 
            router.replace('/Login'); 
          }
        }
      ]
    );
  };

  const userImage = getMediaUrl(user?.profile_picture) ? { uri: getMediaUrl(user?.profile_picture) } : DEFAULT_IMAGE;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <AppText style={styles.headerTitle}>Account Settings</AppText>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* User Info Card */}
        <AnimatedWrapper index={0}>
          <View style={styles.profileCard}>
            <Image source={userImage} style={styles.avatar} />
            <View style={styles.profileInfo}>
              <AppText style={styles.nameId} numberOfLines={1}>#{user?.user_id}</AppText>
              <AppText style={styles.nameText} numberOfLines={1}>{user?.name}</AppText>
              <AppText style={styles.memberSinceText}>
                Member since {new Date(user?.created_at || Date.now()).getFullYear()}
              </AppText>
            </View>
            <Pressable 
              style={({pressed}) => [styles.editBtn, pressed && { backgroundColor: '#42756C25' }]} 
              onPress={() => router.push('/profile/EditProfile')}
            >
              <Ionicons name="pencil" size={18} color="#42756C" />
            </Pressable>
          </View>
        </AnimatedWrapper>

        {/* Contact Details */}
        <AnimatedWrapper index={1}>
          <View style={styles.sectionCard}>
            <AppText style={styles.sectionTitle}>Contact Details</AppText>
            
            <Pressable 
              onPress={() => router.push('/profile/ChangeEmail')}
            >
              {({ pressed }) => (
                <View style={[styles.detailRow, pressed && { backgroundColor: '#F3F4F6', borderRadius: 12, marginHorizontal: -10, paddingHorizontal: 10 }]}>
                  <View style={styles.iconCircle}><Ionicons name="mail" size={18} color="#6B7280" /></View>
                  <View style={styles.detailTextContainer}>
                    <AppText style={styles.detailLabel}>Email Address</AppText>
                    <AppText style={styles.detailValue}>{user?.email}</AppText>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={pressed ? "#42756C" : "#D1D5DB"} />
                </View>
              )}
            </Pressable>

            <View style={[styles.detailRow, { borderBottomWidth: 0, paddingBottom: 0, marginBottom: 0 }]}>
              <View style={styles.iconCircle}><Ionicons name="call" size={18} color="#6B7280" /></View>
              <View style={styles.detailTextContainer}>
                <AppText style={styles.detailLabel}>Phone Number</AppText>
                <AppText style={styles.detailValue}>{user?.phone_number || "Not provided"}</AppText>
              </View>
            </View>
          </View>
        </AnimatedWrapper>

        {/* SUMMARY CARD */}
        <AnimatedWrapper index={2}>
          <Pressable 
            onPress={() => router.push('/pets')} 
          >
            {({ pressed }) => (
              <View style={[styles.summaryCard]}>
                <View style={styles.summaryIconBox}>
                  <Ionicons name="paw" size={24} color="#42756C" />
                </View>
                <View style={styles.summaryTextContainer}>
                  <AppText style={styles.summaryTitle}>My Registered Pets</AppText>
                  {loadingPets ? (
                    <ActivityIndicator size="small" color="#42756C" style={{alignSelf: 'flex-start', marginTop: 4}} />
                  ) : (
                    <AppText style={styles.summarySubtitle}>
                      {petCount === 0 ? "No pets added yet" : `You have ${petCount} pet${petCount > 1 ? 's' : ''} saved`}
                    </AppText>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color={pressed ? "#42756C" : "#D1D5DB"} />
              </View>
            )}
          </Pressable>
        </AnimatedWrapper>

        {/* Action Buttons */}
        <AnimatedWrapper index={3}>
          <View style={styles.actionContainer}>
            <Pressable 
              onPress={() => router.push('/profile/ChangePassword')}
            >
              {({ pressed }) => (
                <View style={[styles.actionBtn]}>
                  <Ionicons name="lock-closed-outline" size={22} color="#4B5563" />
                  <AppText style={styles.actionBtnText}>Change Password</AppText>
                  <Ionicons name="chevron-forward" size={20} color={pressed ? "#42756C" : "#D1D5DB"} />
                </View>
              )}
            </Pressable>

            <Pressable 
              onPress={handleLogout}
            >
              {({ pressed }) => (
                <View style={[styles.actionBtn]}>
                  <Ionicons name="log-out-outline" size={22} color="#EF4444" />
                  <AppText style={[styles.actionBtnText, { color: '#EF4444' }]}>Log Out</AppText>
                  <Ionicons name="chevron-forward" size={20} color={pressed ? "#EF4444" : "#D1D5DB"} />
                </View>
              )}
            </Pressable>
          </View>
        </AnimatedWrapper>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, backgroundColor: '#FFFFFF' },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#111827' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: '#D1D5DB' },
  avatar: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#F3F4F6', resizeMode: 'cover', borderWidth: 4, borderColor: Colors.primary },
  profileInfo: { flex: 1, marginLeft: 15 },
  nameId: { fontSize: 13, color: '#6B7280', fontWeight: '500', marginBottom: 2 },
  nameText: { fontSize: 20, fontWeight: '800', color: '#1F1F1F', marginBottom: 4, paddingRight: 10 },
  memberSinceText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  editBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#42756C15', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D1D5DB' },

  sectionCard: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: '#D1D5DB' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1F1F1F', marginBottom: 15 },
  detailRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 15, marginBottom: 15 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  detailTextContainer: { flex: 1 },
  detailLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600', marginBottom: 2 },
  detailValue: { fontSize: 15, color: '#1F1F1F', fontWeight: '700' },

  summaryCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20, marginBottom: 25, borderWidth: 1, borderColor: '#D1D5DB' },
  summaryIconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#42756C15', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  summaryTextContainer: { flex: 1 },
  summaryTitle: { fontSize: 16, fontWeight: '800', color: '#1F1F1F', marginBottom: 2 },
  summarySubtitle: { fontSize: 13, color: '#6B7280', fontWeight: '500' },

  actionContainer: { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#D1D5DB', overflow: 'hidden' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  actionBtnText: { flex: 1, fontSize: 16, fontWeight: '700', color: '#4B5563', marginLeft: 15 }
});