import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Pressable, Animated, TextInput, TouchableOpacity } from 'react-native';
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

// 1. New Component: Represents the Parent Clinic
import { Image } from 'react-native'; // Make sure Image is imported at the top!

// 1. New Component: Represents the Parent Clinic
const ClinicParentCard = ({ clinic, index, onSelect, getMediaUrl }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => Animated.timing(scaleAnim, { toValue: 1.01, duration: 150, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();

  // Handle the logo URL (using your branch_logo column)
  const logoUrl = getMediaUrl(clinic.brand_logo);
  const logoSource = logoUrl ? { uri: logoUrl } : NO_IMAGE;

  return (
    <AnimatedWrapper index={index}>
      <Pressable 
        onPress={() => onSelect(clinic.clinic_id)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View style={[styles.clinicParentCard, { transform: [{ scale: scaleAnim }] }]}>
          
          {/* Updated: Clinic Logo Container */}
          <View style={styles.clinicIconBg}>
            <Image source={logoSource} style={styles.clinicLogoImage} />
          </View>

          <View style={styles.clinicParentInfo}>
            <AppText style={styles.clinicParentName}>{clinic.clinic_name}</AppText>
            <AppText style={styles.clinicParentSub}>
              {clinic.branches.length} {clinic.branches.length === 1 ? 'Branch' : 'Branches'} Available
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </Animated.View>
      </Pressable>
    </AnimatedWrapper>
  );
};

// 2. Component: Represents the actual Branch
const BranchCardItem = ({ branch, getMediaUrl, handleSelectClinic }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const imageSource = getMediaUrl(branch.branch_image) ? { uri: getMediaUrl(branch.branch_image) } : NO_IMAGE;

  const handlePressIn = () => Animated.timing(scaleAnim, { toValue: 1.05, duration: 200, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();

  return (
    <View style={styles.branchCard}>
      <Pressable 
        onPress={() => handleSelectClinic(branch.branch_id)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [pressed && { backgroundColor: '#F9FAFB' }]}
      >
        {({ pressed }) => (
          <View>
            <View style={styles.imageContainer}>
              <Animated.Image source={imageSource} style={[styles.branchImage, { transform: [{ scale: scaleAnim }] }]} />
            </View>
            
            <View style={styles.cardContent}>
              <View style={styles.cardMain}>
                <AppText style={styles.branchName} numberOfLines={1}>{branch.branch_name}</AppText>
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={14} color="#6B7280" style={{ marginTop: 2 }} />
                  <AppText style={styles.infoText} numberOfLines={2}>{branch.full_address || "Address not provided"}</AppText>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="call-outline" size={14} color="#6B7280" />
                  <AppText style={styles.infoText}>{branch.contact_number || "N/A"}</AppText>
                </View>
              </View>
              <View style={[styles.chevronBtn, pressed && { backgroundColor: Colors.primary }]}>
                <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
              </View>
            </View>
          </View>
        )}
      </Pressable>

      {branch.services && branch.services.length > 0 && (
        <View style={styles.servicesContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.servicesScroll}>
            {branch.services.map((serviceName, i) => (
              <View key={i} style={styles.servicePreviewChip}>
                <AppText style={styles.servicePreviewChipText} numberOfLines={1}>{serviceName}</AppText>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};


export default function SelectClinic() {
  const router = useRouter();
  
  const [allClinics, setAllClinics] = useState([]); 
  const [clinics, setClinics] = useState([]);      
  const [loading, setLoading] = useState(true);

  // New State to handle the "Drill-Down" view
  const [activeClinicId, setActiveClinicId] = useState(null);

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
    let result = allClinics.map(clinic => {
      let filteredBranches = clinic.branches.filter(b => {
        let matchSearch = true;
        if (searchQuery.trim() !== '') {
          const q = searchQuery.toLowerCase();
          const matchCName = clinic.clinic_name?.toLowerCase().includes(q);
          const matchBName = b.branch_name?.toLowerCase().includes(q);
          const matchMuni = b.municipality?.toLowerCase().includes(q);
          const matchProv = b.province?.toLowerCase().includes(q);
          const matchServ = b.services?.some(s => s.toLowerCase().includes(q)); 
          matchSearch = matchCName || matchBName || matchMuni || matchProv || matchServ;
        }

        let matchProv = selectedProvince ? b.province === selectedProvince : true;
        let matchMuni = selectedMunicipality ? b.municipality === selectedMunicipality : true;
        let matchServ = selectedService ? b.services?.includes(selectedService) : true;

        return matchSearch && matchProv && matchMuni && matchServ;
      });

      return { ...clinic, branches: filteredBranches };
    }).filter(clinic => clinic.branches.length > 0);

    setClinics(result);
  }, [searchQuery, selectedProvince, selectedMunicipality, selectedService, allClinics]);

  const fetchClinics = async () => {
    try {
      const data = await authFetch(`${API_URL}/api/pet-owner/appointments/get-active-clinics.php`);
      if (data?.success) {
        setAllClinics(data.data);
        setClinics(data.data);

        let allProvs = [], allMunis = [], allServs = [];
        data.data.forEach(clinic => {
          clinic.branches.forEach(b => {
            if (b.province) allProvs.push(b.province);
            if (b.municipality) allMunis.push(b.municipality);
            if (b.services) allServs.push(...b.services);
          });
        });

        setAvailableProvinces([...new Set(allProvs)]);
        setAvailableMunicipalities([...new Set(allMunis)]);
        setAvailableServices([...new Set(allServs)]);
      } else {
        Toast.show({ type: 'error', text1: 'Something went wrong' });
      }
    } catch (error) {
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

  const handleSelectClinic = (branchId) => {
    router.push({ pathname: `/clinics/${branchId}` });
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
            <ScrollView nestedScrollEnabled style={styles.dropdownScroll}>
              <Pressable style={styles.dropdownItem} onPress={() => { onSelect(''); setOpenDropdown(null); }}>
                <AppText style={!selectedValue ? styles.dropdownItemTextSelected : styles.dropdownItemText}>Any {label}</AppText>
              </Pressable>
              {options.map((opt, index) => (
                <Pressable key={index} style={styles.dropdownItem} onPress={() => { onSelect(opt); setOpenDropdown(null); }}>
                  <AppText style={selectedValue === opt ? styles.dropdownItemTextSelected : styles.dropdownItemText}>{opt}</AppText>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  // Determine what to show based on the activeClinicId
  const activeClinicData = activeClinicId ? clinics.find(c => c.clinic_id === activeClinicId) : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <AppText style={styles.headerTitle}>Clinics</AppText>
        <TouchableOpacity 
          style={[styles.filterBtn, (showFilters || isAnyFilterActive) && styles.filterBtnActive]} 
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons name="options" size={20} color={(showFilters || isAnyFilterActive) ? '#FFF' : '#111827'} />
        </TouchableOpacity>
      </View>

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
            {(isAnyFilterActive || searchQuery) && (
              <Pressable onPress={clearFilters}>
                <AppText style={styles.clearFiltersText}>Clear All</AppText>
              </Pressable>
            )}
          </View>
          {availableProvinces.length > 0 && renderCustomDropdown("Province", availableProvinces, selectedProvince, setSelectedProvince, 'province')}
          {availableMunicipalities.length > 0 && renderCustomDropdown("Municipality", availableMunicipalities, selectedMunicipality, setSelectedMunicipality, 'municipality')}
          {availableServices.length > 0 && renderCustomDropdown("Service", availableServices, selectedService, setSelectedService, 'service')}
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Toggle between showing ALL Clinics vs showing BRANCHES of the selected clinic */}
        {!activeClinicData ? (
          <>
            <AppText style={styles.sectionSubtitle}>
              Select a clinic brand to view its available branches.
            </AppText>

            {clinics.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={48} color="#9CA3AF" style={{ marginBottom: 12 }} />
                <AppText style={styles.emptyTitle}>No Clinics Found</AppText>
                <AppText style={styles.emptySubtitle}>Try adjusting your filters or search terms.</AppText>
              </View>
            ) : (
              clinics.map((clinic, index) => (
                <ClinicParentCard 
                  key={clinic.clinic_id} 
                  clinic={clinic} 
                  index={index} 
                  onSelect={setActiveClinicId} 
                  getMediaUrl={getMediaUrl}
                />
              ))
            )}
          </>
        ) : (
          <>
            {/* Back Button and Selected Clinic Header */}
            <TouchableOpacity activeOpacity={1} style={styles.backButton} onPress={() => setActiveClinicId(null)}>
              <Ionicons name="arrow-back" size={20} color={Colors.dark} />
              <AppText style={styles.backButtonText}>Back to all clinics</AppText>
            </TouchableOpacity>

            <AppText style={styles.selectedClinicTitle}>{activeClinicData.clinic_name} Branches</AppText>
            <AppText style={styles.sectionSubtitle}>Select a specific branch to book an appointment.</AppText>

            {activeClinicData.branches.map((branch) => (
              <BranchCardItem 
                key={branch.branch_id} 
                branch={branch} 
                getMediaUrl={getMediaUrl} 
                handleSelectClinic={handleSelectClinic} 
              />
            ))}
          </>
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
  filterBtn: { backgroundColor: '#FFF', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  filterBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  
  searchWrapper: { paddingHorizontal: 20, paddingBottom: 10 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 16, height: 50, borderWidth: 1, borderColor: '#D1D5DB' },
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
  dropdownListWrapper: { marginTop: 4, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8 },
  dropdownScroll: { maxHeight: 160 }, 
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dropdownItemText: { fontSize: 14, color: '#4B5563', textTransform: 'capitalize' },
  dropdownItemTextSelected: { fontSize: 14, color: Colors.primary, fontWeight: '700', textTransform: 'capitalize' },

  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },
  sectionSubtitle: { fontSize: 15, color: '#6B7280', marginBottom: 20, lineHeight: 22 },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, backgroundColor: Colors.white },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 },

  // --- Clinic Parent Card Styles ---
  clinicParentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#D1D5DB' },
  // Make sure overflow is hidden so the image respects the border radius
  clinicIconBg: { width: 48, height: 48, borderRadius: 10, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', marginRight: 16, overflow: 'hidden' },
  // New style for the actual image
  clinicLogoImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  clinicParentInfo: { flex: 1 },
  clinicParentName: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 4 },
  clinicParentSub: { fontSize: 13, color: Colors.primary, fontWeight: '600' },

  // --- Drill-Down Header Styles ---
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, alignSelf: 'flex-start' },
  backButtonText: { fontSize: 15, fontWeight: '600', color: Colors.dark, marginLeft: 6 },
  selectedClinicTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 6 },

  // --- Nested Branch Card Styles ---
  branchCard: { backgroundColor: Colors.white, borderRadius: 10, borderWidth: 1, borderColor: '#D1D5DB', overflow: 'hidden', marginBottom: 16 },
  imageContainer: { width: '100%', height: 120, backgroundColor: '#E5E7EB', overflow: 'hidden' },
  branchImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  cardContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 10, justifyContent: 'space-between' },
  cardMain: { flex: 1, paddingRight: 12 },
  branchName: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 4 },
  infoText: { fontSize: 13, color: '#4B5563', flex: 1, lineHeight: 18 },
  chevronBtn: { width: 26, height: 26, borderRadius: 6, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' },

  servicesContainer: { borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#FFF', paddingVertical: 8 },
  servicesScroll: { paddingHorizontal: 12, gap: 6 },
  servicePreviewChip: { backgroundColor: '#F9FAFB', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: '#E5E7EB' },
  servicePreviewChipText: { fontSize: 11, fontWeight: '600', color: '#6B7280', textTransform: 'capitalize' }
});