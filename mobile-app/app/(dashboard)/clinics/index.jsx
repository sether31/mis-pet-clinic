import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Pressable, Image, TouchableOpacity, Animated, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import AppText from '../../../components/AppText';
import AnimatedWrapper from '../../../components/AnimatedWrapper'; 
import { Colors } from '../../../constants/Color';
import { authFetch } from '../../../utils/auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const NO_IMAGE = require('../../../assets/images/no-image.jpg');

const ClinicCardItem = ({ clinic, index, getMediaUrl, handleSelectClinic }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const imageSource = getMediaUrl(clinic.branch_image) ? { uri: getMediaUrl(clinic.branch_image) } : NO_IMAGE;

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 1.1, 
      duration: 300, 
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  return (
    <AnimatedWrapper index={index}> 
      <View style={styles.clinicCard}>
        <Pressable 
          onPress={() => handleSelectClinic(clinic.branch_id)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={({ pressed }) => [pressed && { backgroundColor: '#F9FAFB' }]}
        >
          {({ pressed }) => (
            <View>
              <View style={styles.imageContainer}>
                <Animated.Image 
                  source={imageSource} 
                  style={[styles.clinicImage, { transform: [{ scale: scaleAnim }] }]} 
                />
              </View>
              
              <View style={styles.cardContent}>
                <View style={styles.cardMain}>
                  <AppText style={styles.clinicName} numberOfLines={1}>
                    {clinic.branch_name}
                  </AppText>
                  
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={16} color="#6B7280" style={{ marginTop: 2 }} />
                    <AppText style={styles.infoText} numberOfLines={2}>
                      {clinic.full_address || "Address not provided"}
                    </AppText>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <Ionicons name="call-outline" size={16} color="#6B7280" />
                    <AppText style={styles.infoText}>{clinic.contact_number || "N/A"}</AppText>
                  </View>
                </View>

                <View style={[styles.chevronBtn, pressed && { backgroundColor: Colors.primary }]}>
                  <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                </View>
              </View>
            </View>
          )}
        </Pressable>

        {/* Services Chips */}
        {clinic.services && clinic.services.length > 0 ? (
          <View style={styles.servicesContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.servicesScroll}
            >
              {clinic.services.map((serviceName, i) => (
                <View key={i} style={styles.servicePreviewChip}>
                  <AppText 
                    style={styles.servicePreviewChipText}
                    numberOfLines={1}  
                    ellipsizeMode="tail"
                  >
                    {serviceName}
                  </AppText>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </View>
    </AnimatedWrapper>
  );
};


export default function SelectClinic() {
  const router = useRouter();
  
  const [allClinics, setAllClinics] = useState([]); 
  const [clinics, setClinics] = useState([]);       
  const [loading, setLoading] = useState(true);

  const [availableProvinces, setAvailableProvinces] = useState([]);
  const [availableMunicipalities, setAvailableMunicipalities] = useState([]);
  const [availableServices, setAvailableServices] = useState([]);

  const [showFilters, setShowFilters] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedMunicipality, setSelectedMunicipality] = useState('');
  const [selectedService, setSelectedService] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');

  const [openDropdown, setOpenDropdown] = useState(null);

  useEffect(() => {
    fetchClinics();
  }, []);

  useEffect(() => {
    let result = allClinics;

    // Text Search Filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => {
        const matchName = c.branch_name?.toLowerCase().includes(q);
        const matchMuni = c.municipality?.toLowerCase().includes(q);
        const matchProv = c.province?.toLowerCase().includes(q);
        // Search inside services array too
        const matchServ = c.services?.some(s => s.toLowerCase().includes(q)); 
        
        return matchName || matchMuni || matchProv || matchServ;
      });
    }

    // Dropdown Filters
    if(selectedProvince) result = result.filter(c => c.province === selectedProvince);
    if(selectedMunicipality) result = result.filter(c => c.municipality === selectedMunicipality);
    if(selectedService) result = result.filter(c => c.services && c.services.includes(selectedService));

    setClinics(result);
  }, [searchQuery, selectedProvince, selectedMunicipality, selectedService, allClinics]);

  const fetchClinics = async () => {
    try {
      const data = await authFetch(`${API_URL}/api/pet-owner/appointments/get-active-clinics.php`);
      
      if (data?.success) {
        const fetchedData = data.data;
        setAllClinics(fetchedData);
        setClinics(fetchedData);

        const uniqueProvinces = [...new Set(fetchedData.map(c => c.province).filter(Boolean))];
        const uniqueMunicipalities = [...new Set(fetchedData.map(c => c.municipality).filter(Boolean))];
        
        let allServicesList = [];
        fetchedData.forEach(c => {
          if (c.services) allServicesList.push(...c.services);
        });
        const uniqueServices = [...new Set(allServicesList)];

        setAvailableProvinces(uniqueProvinces);
        setAvailableMunicipalities(uniqueMunicipalities);
        setAvailableServices(uniqueServices);

      } else {
        Toast.show({ type: 'error', text1: 'Something went wrong' });
      }
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Something went wrong' });
    } finally {
      setLoading(false);
    }
  };

  const getMediaUrl = (path) => {
    if (!path || path.trim() === '') return null;
    if (path.startsWith('http')) return path; 
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${API_URL}/${cleanPath}`;
  };

  const handleSelectClinic = (clinicId) => {
    router.push({ pathname: `/clinics/${clinicId}` });
  };

  const clearFilters = () => {
    setSelectedProvince('');
    setSelectedMunicipality('');
    setSelectedService('');
    setSearchQuery(''); 
    setOpenDropdown(null);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const isAnyFilterActive = selectedProvince !== '' || selectedMunicipality !== '' || selectedService !== '';

  const renderCustomDropdown = (label, options, selectedValue, onSelect, dropdownKey) => {
    const isOpen = openDropdown === dropdownKey;

    return (
      <View style={styles.dropdownContainer}>
        <AppText style={styles.filterLabel}>{label}</AppText>
        
        <Pressable 
          style={[styles.dropdownHeader, isOpen && styles.dropdownHeaderActive]} 
          onPress={() => setOpenDropdown(isOpen ? null : dropdownKey)}
        >
          <AppText style={selectedValue ? styles.dropdownHeaderTextSelected : styles.dropdownHeaderText}>
            {selectedValue || `Any ${label}`}
          </AppText>
          <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={18} color="#6B7280" />
        </Pressable>

        {isOpen && (
          <View style={styles.dropdownListWrapper}>
            <ScrollView nestedScrollEnabled style={styles.dropdownScroll} showsVerticalScrollIndicator={true}>
              <Pressable 
                style={styles.dropdownItem} 
                onPress={() => { onSelect(''); setOpenDropdown(null); }}
              >
                <AppText style={!selectedValue ? styles.dropdownItemTextSelected : styles.dropdownItemText}>
                  Any {label}
                </AppText>
              </Pressable>

              {options.map((opt, index) => {
                const isSelected = selectedValue === opt;
                return (
                  <Pressable 
                    key={index} 
                    style={styles.dropdownItem} 
                    onPress={() => { onSelect(opt); setOpenDropdown(null); }}
                  >
                    <AppText style={isSelected ? styles.dropdownItemTextSelected : styles.dropdownItemText}>
                      {opt}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <AppText style={styles.headerTitle}>Clinics</AppText>
        
        <TouchableOpacity 
          style={[styles.filterBtn, (showFilters || isAnyFilterActive) && styles.filterBtnActive]} 
          onPress={() => setShowFilters(!showFilters)}
          activeOpacity={0.8}
        >
          <Ionicons name="options" size={20} color={(showFilters || isAnyFilterActive) ? '#FFF' : '#111827'} />
        </TouchableOpacity>
      </View>

      {/* Search Bar Wrapper */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search clinics, services, or cities..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showFilters && (
        <View style={styles.filterSection}>
          <View style={styles.filterHeader}>
            <AppText style={styles.filterTitle}>Filter by:</AppText>
            {(isAnyFilterActive || searchQuery) ? (
              <Pressable onPress={clearFilters}>
                <AppText style={styles.clearFiltersText}>Clear All</AppText>
              </Pressable>
            ) : null}
          </View>

          {availableProvinces.length > 0 && renderCustomDropdown("Province", availableProvinces, selectedProvince, setSelectedProvince, 'province')}
          {availableMunicipalities.length > 0 && renderCustomDropdown("Municipality", availableMunicipalities, selectedMunicipality, setSelectedMunicipality, 'municipality')}
          {availableServices.length > 0 && renderCustomDropdown("Service", availableServices, selectedService, setSelectedService, 'service')}
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AppText style={styles.sectionSubtitle}>
          Discover nearby clinics, view available services, and book appointments instantly.
        </AppText>

        {clinics.length === 0 ? (
          <AnimatedWrapper index={0}>
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color="#9CA3AF" style={{ marginBottom: 12 }} />
              <AppText style={styles.emptyTitle}>No Clinics Found</AppText>
              <AppText style={styles.emptySubtitle}>Try adjusting your filters or search terms.</AppText>
            </View>
          </AnimatedWrapper>
        ) : (
          clinics.map((clinic, index) => (
            <ClinicCardItem 
              key={clinic.branch_id} 
              clinic={clinic} 
              index={index} 
              getMediaUrl={getMediaUrl} 
              handleSelectClinic={handleSelectClinic} 
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg50 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg50 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 10 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#111827' },
  
  filterBtn: { backgroundColor: '#FFF', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  filterBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  

  searchWrapper: { paddingHorizontal: 20, paddingBottom: 10 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 16, height: 50, borderWidth: 1, borderColor: '#D1D5DB', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  searchInput: { flex: 1, fontSize: 16, color: '#111827', marginLeft: 10 },
  clearSearchBtn: { padding: 4 },

  filterSection: { backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingVertical: 16 },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 },
  filterTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  clearFiltersText: { fontSize: 14, fontWeight: '600', color: '#EF4444' },

  dropdownContainer: { paddingHorizontal: 20, marginBottom: 12 },
  filterLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 6 },
  dropdownHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  dropdownHeaderActive: { borderColor: Colors.primary, backgroundColor: '#FFF' },
  dropdownHeaderText: { fontSize: 14, color: '#6B7280' },
  dropdownHeaderTextSelected: { fontSize: 14, color: '#111827', fontWeight: '600' },
  
  dropdownListWrapper: { marginTop: 4, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
  dropdownScroll: { maxHeight: 160 }, 
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dropdownItemText: { fontSize: 14, color: '#4B5563', textTransform: 'capitalize' },
  dropdownItemTextSelected: { fontSize: 14, color: Colors.primary, fontWeight: '700', textTransform: 'capitalize' },

  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },
  sectionSubtitle: { fontSize: 15, color: '#6B7280', marginBottom: 20, lineHeight: 22 },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, backgroundColor: Colors.white },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 },

  clinicCard: { backgroundColor: Colors.white, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  
  imageContainer: { width: '100%', height: 120, backgroundColor: '#E5E7EB', overflow: 'hidden' },
  clinicImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  
  cardContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, justifyContent: 'space-between' },
  cardMain: { flex: 1, paddingRight: 16 },
  
  clinicName: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 6 },
  infoText: { fontSize: 14, color: '#4B5563', flex: 1, lineHeight: 20 },

  chevronBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' },

  servicesContainer: { borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#F9FAFB', paddingVertical: 10 },
  servicesScroll: { paddingHorizontal: 16, gap: 8 },
  servicePreviewChip: { backgroundColor: Colors.white, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB', maxWidth: 'max-content' },
  servicePreviewChipText: { fontSize: 12, fontWeight: '600', color: '#6B7280', textTransform: 'capitalize' }
});