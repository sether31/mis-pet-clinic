import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Pressable, Image, Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import AppText from '../../../components/AppText';
import AnimatedWrapper from '../../../components/AnimatedWrapper';
import { Colors } from '../../../constants/Color';
import { authFetch } from '../../../utils/auth';

import ServicesTab from './_components/ServicesTab';
import ProductsTab from './_components/ProductsTab';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const NO_IMAGE = require('../../../assets/images/no-image.jpg');

export default function ClinicOverview() {
  const router = useRouter();
  // 💥 ADDED: extract 'from' to handle custom back button routing
  const { id, from } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [clinic, setClinic] = useState(null);
  const [services, setServices] = useState([]);
  
  const [isCheckingCapacity, setIsCheckingCapacity] = useState(true);
  const [isClinicFull, setIsClinicFull] = useState(false);
  const [activeTab, setActiveTab] = useState('services');

  useFocusEffect(
    useCallback(() => {
      if(id) {
        setLoading(true); 
        fetchClinicData();
        checkClinicCapacity(); 
      }
    }, [id])
  );

  const fetchClinicData = async () => {
    try {
      const response = await authFetch(`${API_URL}/api/pet-owner/appointments/get-clinic-details.php?branch_id=${id}`);
      
      if(response?.success) {
        setClinic(response.data.clinic);
        setServices(response.data.services || []);
      } else {
        Toast.show({ type: 'error', text1: 'Something went wrong' });
        router.back();
      }
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Something went wrong' });
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const checkClinicCapacity = async () => {
    setIsCheckingCapacity(true);
    try {
      const res = await authFetch(`${API_URL}/api/pet-owner/appointments/check-capacity.php?branch_id=${id}`);
      if (res?.success && res.data?.is_full) {
        setIsClinicFull(true);
      }
    } catch (error) {
      console.error("Failed to check capacity", error);
    } finally {
      setIsCheckingCapacity(false);
    }
  };

  const getMediaUrl = (path) => {
    if (!path || path.trim() === '') return null;
    if (path.startsWith('http')) return path; 
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${API_URL}/${cleanPath}`;
  };

  const handleOpenLink = async (url, type) => {
    if(!url) {
      Toast.show({ type: 'info', text1: `${type} not provided by this clinic.` });
      return;
    }
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Toast.show({ type: 'error', text1: 'Something went wrong' });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Something went wrong' });
    }
  };

  const handleBack = () => {
    if (from === 'activity') {
      router.push('/activity'); 
    } else {
      router.back(); 
    }
  };

  if(loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const imageSource = getMediaUrl(clinic?.branch_image) ? { uri: getMediaUrl(clinic?.branch_image) } : NO_IMAGE;
  const hasShop = clinic?.has_shop === 1 || clinic?.has_shop === "1";

  // Gatekeeper 
  const isClinicLocked = 
    clinic?.is_maintenance == 1 || 
    clinic?.clinic_status !== 'approved' || 
    clinic?.has_active_sub == 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="arrow-back" size={26} color="#111827" />
        </Pressable>
        <AppText numberOfLines={1} style={styles.headerTitle}>{clinic?.branch_name || "Overview"}</AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        <Image source={imageSource} style={styles.bannerImage} />

        <View style={styles.infoContainer}>
          <View style={styles.titleRow}>
            <AppText style={styles.clinicName}>{clinic?.branch_name}</AppText>
            
            {clinic?.est ? (
              <View style={styles.estBadge}>
                <Ionicons name="star" size={12} color={Colors.primary} />
                <AppText style={styles.estText}>Est. {clinic.est}</AppText>
              </View>
            ) : null}
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="location" size={16} color={Colors.primary} />
            <AppText style={styles.infoText}>{clinic?.full_address || "Address not provided"}</AppText>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="call" size={16} color={Colors.primary} />
            <AppText style={[styles.infoText, !clinic?.contact_number && { color: '#9CA3AF' }]}>
              {clinic?.contact_number || "N/A"}
            </AppText>
          </View>

          <View style={styles.linksRow}>
            <Pressable 
              style={[styles.linkBtn, { backgroundColor: '#1877F2' }, !clinic?.facebook && styles.linkBtnDisabled]} 
              onPress={() => handleOpenLink(clinic?.facebook, 'Facebook page')}
            >
              <Ionicons name="logo-facebook" size={16} color={Colors.white} />
              <AppText style={styles.linkBtnText}>Facebook</AppText>
            </Pressable>

            <Pressable 
              style={[styles.linkBtn, { backgroundColor: '#4B5563' }, !clinic?.website && styles.linkBtnDisabled]} 
              onPress={() => handleOpenLink(clinic?.website, 'Website')}
            >
              <Ionicons name="globe-outline" size={16} color={Colors.white} />
              <AppText style={styles.linkBtnText}>Website</AppText>
            </Pressable>
          </View>

          <View style={styles.descriptionContainer}>
            <AppText style={styles.descriptionTitle}>About Clinic</AppText>
            <AppText style={[styles.descriptionText, !clinic?.description && { fontStyle: 'italic', color: '#9CA3AF' }]}>
              {clinic?.description || "No description provided."}
            </AppText>
          </View>
        </View>

        {/* GATEKEEPER */}
        {isClinicLocked ? (
          <AnimatedWrapper index={0}>
            <View style={styles.systemLockContainer}>
              <View style={styles.systemLockIconCircle}>
                <Ionicons name="warning" size={40} color="#EF4444" />
              </View>
              <AppText style={styles.systemLockTitle}>Temporarily Unavailable</AppText>
              <AppText style={styles.systemLockSubtitle}>
                This clinic is currently under maintenance or unavailable. Online booking and shopping are disabled at this time.
              </AppText>
            </View>
          </AnimatedWrapper>
        ) : (
          <>
            {/* tabs */}
            <View style={styles.tabContainer}>
              <Pressable 
                style={[styles.tabBtn, activeTab === 'services' && styles.tabBtnActive]} 
                onPress={() => setActiveTab('services')}
              >
                <View style={styles.tabRow}>
                  <Ionicons name={activeTab === 'services' ? "paw" : "paw-outline"} size={16} color={activeTab === 'services' ? Colors.primary : '#9CA3AF'} />
                  <AppText style={[styles.tabText, activeTab === 'services' && styles.tabTextActive]}>Services</AppText>
                </View>
              </Pressable>
              
              <Pressable 
                style={[styles.tabBtn, activeTab === 'products' && styles.tabBtnActive]} 
                onPress={() => setActiveTab('products')}
              >
                <View style={styles.tabRow}>
                  <Ionicons name={activeTab === 'products' ? "cart" : "cart-outline"} size={16} color={activeTab === 'products' ? Colors.primary : '#9CA3AF'} />
                  <AppText style={[styles.tabText, activeTab === 'products' && styles.tabTextActive]}>Products</AppText>
                </View>
              </Pressable>
            </View>

            {/* Content Area */}
            <View style={styles.contentArea}>
              {activeTab === 'services' ? (
                
                isCheckingCapacity ? (
                  <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                  </View>
                ) : isClinicFull ? (
                  <AnimatedWrapper index={0}>
                    <View style={styles.fullCapacityContainer}>
                      <View style={styles.fullCapacityIconCircle}>
                        <Ionicons name="lock-closed" size={40} color="#9CA3AF" />
                      </View>
                      <AppText style={styles.fullCapacityTitle}>Services at Capacity</AppText>
                      <AppText style={styles.fullCapacitySubtitle}>
                        This clinic is currently not accepting new appointments for services. Please check back later.
                      </AppText>
                    </View>
                  </AnimatedWrapper>
                ) : (
                  <ServicesTab services={services} branchId={id} />
                )

              ) : (
                hasShop ? (
                  <ProductsTab branchId={id} />
                ) : (
                  <AnimatedWrapper index={0}>
                    <View style={styles.unavailableContainer}>
                      <View style={styles.unavailableIconCircle}>
                        <Ionicons name="cart-outline" size={40} color="#9CA3AF" />
                      </View>
                      <AppText style={styles.unavailableTitle}>Shop Unavailable</AppText>
                      <AppText style={styles.unavailableSubtitle}>
                        This clinic currently does not offer online products or shop items.
                      </AppText>
                    </View>
                  </AnimatedWrapper>
                )
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg50 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg50 },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 15, backgroundColor: Colors.white, zIndex: 10 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#111827', textAlign: 'center', marginHorizontal: 4 },  
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  bannerImage: { width: '100%', height: 180, resizeMode: 'cover', backgroundColor: '#E5E7EB' },
  
  infoContainer: { padding: 20, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, gap: 10 },
  clinicName: { fontSize: 24, fontWeight: '900', color: '#111827', flex: 1 },
  estBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
  estText: { color: Colors.primary, fontSize: 13, fontWeight: '800' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  infoText: { fontSize: 14, color: '#4B5563', flex: 1, lineHeight: 20 },
  linksRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 16 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, gap: 6 },
  linkBtnDisabled: { opacity: 0.4 }, 
  linkBtnText: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  descriptionContainer: { marginTop: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  descriptionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 6 },
  descriptionText: { fontSize: 14, color: '#6B7280', lineHeight: 22 },

  // Tabs
  tabContainer: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 10, padding: 4, marginHorizontal: 20, marginTop: 20, marginBottom: 10 },
  tabBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tabBtnActive: { backgroundColor: Colors.white, shadowOpacity: 0.05 },
  tabRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  tabText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: Colors.primary, fontWeight: '800' },

  contentArea: { flex: 1, marginTop: 10 }, 
  
  // Unavailable Shop Style 
  unavailableContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50, marginHorizontal: 20, backgroundColor: Colors.white, borderRadius: 16, borderStyle: 'dashed', borderWidth: 2, borderColor: '#D1D5DB' },
  unavailableIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  unavailableTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  unavailableSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', paddingHorizontal: 30, lineHeight: 22 },

  // Full Capacity Style
  fullCapacityContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50, marginHorizontal: 20, borderRadius: 16, borderStyle: 'dashed', borderWidth: 2, borderColor: '#D1D5DB' },
  fullCapacityIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  fullCapacityTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 8 },
  fullCapacitySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', paddingHorizontal: 30, lineHeight: 22 },

  systemLockContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, marginHorizontal: 20, marginTop: 20 },
  systemLockIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  systemLockTitle: { fontSize: 18, fontWeight: '800', color: '#991B1B', marginBottom: 8 },
  systemLockSubtitle: { fontSize: 14, color: '#7F1D1D', textAlign: 'center', paddingHorizontal: 30, lineHeight: 22 },
});