import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Pressable, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';

import AppText from '../../../components/AppText';
import { Colors } from '../../../constants/Color';
import { authFetch } from '../../../utils/auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function BookAppointment() {
  const router = useRouter();
  const { branch_id, branch_service_id, from } = useLocalSearchParams();

  // Selected Data
  const [selectedPet, setSelectedPet] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('');

  // UI States
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLimitReached, setIsLimitReached] = useState(false);
  
  // Dropdown States
  const [isPetDropdownOpen, setIsPetDropdownOpen] = useState(false);
  const [isStaffDropdownOpen, setIsStaffDropdownOpen] = useState(false);

  const [serviceInfo, setServiceInfo] = useState(null);
  const [loadingService, setLoadingService] = useState(true);

  // Fetched Data
  const [myPets, setMyPets] = useState([]);
  const [availableStaff, setAvailableStaff] = useState([]);
  const [availableTimes, setAvailableTimes] = useState([]);

  useEffect(() => {
    fetchMyPets();
    fetchStaff();
    fetchServiceDetails();
  }, []);

  useEffect(() => {
    if (selectedStaff) {
      fetchAvailableTimes(selectedDate, selectedStaff);
    } else {
      setAvailableTimes([]); 
    }
  }, [selectedDate, selectedStaff]);

  const fetchServiceDetails = async () => {
    setLoadingService(true);
    try {
      const res = await authFetch(`${API_URL}/api/pet-owner/appointments/get-service-details.php?branch_service_id=${branch_service_id}`);
      if (res?.success) {
        setServiceInfo(res.data);
      }
    } catch (error) {
      console.error("Failed to load service details", error);
    } finally {
      setLoadingService(false);
    }
  };

  const fetchMyPets = async () => {
    try {
      const res = await authFetch(`${API_URL}/api/pet-owner/pet/get-pets.php`);
      if (res?.success) {
        const eligiblePets = (res.data || []).filter(pet => {
          const isDeceased = Number(pet.is_deceased) === 1;
          const isActive = Number(pet.status) === 0; 
          
          // Only return pets that are NOT deceased AND NOT removed
          return !isDeceased && !isActive;
        });
        
        setMyPets(eligiblePets);
      }
    } catch (error) {
      console.error("Failed to load pets", error);
    }
  };

  const fetchStaff = async () => {
    setLoadingStaff(true);
    try {
      const res = await authFetch(`${API_URL}/api/pet-owner/appointments/get-service-staff.php?branch_id=${branch_id}&branch_service_id=${branch_service_id}`);
      if(res?.success) {
        setAvailableStaff(res.data || []);
        if (res.data && res.data.length === 1) {
          setSelectedStaff(res.data[0].staff_id);
        }
      } else {
        if(res?.is_unavailable) {
          Toast.show({ 
            type: 'error', 
            text1: 'Clinic Unavailable', 
            text2: res.message || 'This clinic cannot accept bookings right now.',
            visibilityTime: 4000
          });
          router.back(); 
          return;
        }
      }
    } catch (error) {
      console.error("Failed to fetch staff", error);
    } finally {
      setLoadingStaff(false);
    }
  };

  const fetchAvailableTimes = async (dateObj, staffId) => {
    if (!staffId) return;

    setLoadingTimes(true);
    setSelectedTime(''); 
    const formattedDate = dateObj.toISOString().split('T')[0];

    try {
      const res = await authFetch(`${API_URL}/api/pet-owner/appointments/get-available-times.php?branch_id=${branch_id}&branch_service_id=${branch_service_id}&staff_id=${staffId}&date=${formattedDate}`);

      if(res?.success) {
        if(res.limit_reached) {
          setIsLimitReached(true);
          setAvailableTimes([]);
        } else {
          setIsLimitReached(false);
          setAvailableTimes(res.data || []); 
        }
      }
    } catch (error) {
      console.error("Failed to fetch times", error);
      setAvailableTimes([]);
    } finally {
      setLoadingTimes(false);
    }
  };

  const handleDateChange = (event, selected) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'set' && selected) {
      setSelectedDate(selected);
    } else {
      setShowDatePicker(false);
    }
  };

  const handleBookAppointment = async () => {
    if (!selectedPet || !selectedStaff || !selectedTime) {
      return Toast.show({ type: 'error', text1: 'Please complete all steps' });
    }

    setIsSubmitting(true);
    const formattedDate = selectedDate.toISOString().split('T')[0];

    try {
      const res = await authFetch(`${API_URL}/api/pet-owner/appointments/create-appointment.php`, {
        method: 'POST',
        body: JSON.stringify({
          branch_id,
          branch_service_id,
          pet_id: selectedPet,
          staff_id: selectedStaff, 
          appointment_date: formattedDate,
          appointment_time: selectedTime
        })
      });

      if (res?.success) {
        Toast.show({ type: 'success', text1: res?.message });
        setSelectedPet(null);
        setSelectedTime('');
        fetchAvailableTimes(selectedDate, selectedStaff);
      } else {
        //  If clinic is expired/maintenance kick them 
        if (res?.is_unavailable) {
          Toast.show({ 
            type: 'error', 
            text1: 'Clinic Unavailable', 
            text2: res.message, 
            text2NumberOfLines: 0,
            visibilityTime: 5000 
          });
          router.back();
          return;
        }

        Toast.show({ type: 'error', text1: res?.message || 'Failed to book' });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Something went wrong' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayDate = selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  const selectedPetData = myPets.find(p => p.pet_id === selectedPet);
  const selectedPetName = selectedPetData ? selectedPetData.name : 'Select a pet';
  
  const selectedStaffData = availableStaff.find(s => s.staff_id === selectedStaff);
  const selectedStaffName = selectedStaffData 
    ? `${selectedStaffData.first_name} ${selectedStaffData.last_name} ${selectedStaffData.role ? `• ${selectedStaffData.role}` : ''}` 
    : 'Select professional';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={26} color="#111827" />
        </Pressable>
        <AppText style={styles.headerTitle}>Book Appointment</AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={styles.serviceHeaderCard}>
          {loadingService ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <>
              <View style={styles.serviceIconBadge}>
                <Ionicons name="paw-outline" size={24} color={Colors.primary} /> 
              </View>
              <AppText style={styles.serviceNameText}>
                {serviceInfo?.custom_name || "Service name"}
              </AppText>
              <AppText style={styles.serviceDescriptionText}>
                {serviceInfo?.custom_description || "No description available."}
              </AppText>
              <View style={styles.priceTag}>
                <Ionicons name="pricetag-outline" size={14} color="#059669" /> 
                <AppText style={styles.priceText}>
                  {`₱${parseFloat(serviceInfo?.price || 0).toLocaleString()}`}
                </AppText>
              </View>
            </>
          )}
        </View>
        
        {/* Step 1: Select Pet */}
        <View style={[styles.section, { zIndex: 50 }]}>
          <AppText style={styles.sectionTitle}>1. Who is this for?</AppText>
          {myPets.length === 0 ? (
            <AppText style={styles.emptyText}>You haven't added any pets yet.</AppText>
          ) : (
            <View>
              <Pressable 
                style={[styles.dropdownHeader, isPetDropdownOpen && styles.dropdownHeaderActive]} 
                onPress={() => {
                  setIsPetDropdownOpen(!isPetDropdownOpen);
                  setIsStaffDropdownOpen(false); 
                }}
              >
                <View style={styles.dropdownHeaderLeft}>
                  <Ionicons name="paw" size={18} color={selectedPet ? Colors.primary : '#9CA3AF'} />
                  <AppText style={selectedPet ? styles.dropdownHeaderTextSelected : styles.dropdownHeaderText}>
                    {selectedPetName}
                  </AppText>
                </View>
                <Ionicons name={isPetDropdownOpen ? "chevron-up" : "chevron-down"} size={20} color="#6B7280" />
              </Pressable>

              {isPetDropdownOpen && (
                <View style={styles.dropdownListWrapper}>
                  <ScrollView nestedScrollEnabled style={styles.dropdownScroll}>
                    {myPets.map(pet => (
                      <Pressable 
                        key={pet.pet_id} 
                        style={styles.dropdownItem} 
                        onPress={() => {
                          setSelectedPet(pet.pet_id);
                          setIsPetDropdownOpen(false);
                        }}
                      >
                        <AppText style={selectedPet === pet.pet_id ? styles.dropdownItemTextSelected : styles.dropdownItemText}>
                          {pet.name} {pet.species ? `(${pet.species})` : ''}
                        </AppText>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Step 2: Select Staff */}
        <View style={[styles.section, { zIndex: 40 }]}>
          <AppText style={styles.sectionTitle}>2. Choose Professional</AppText>
          {loadingStaff ? (
            <ActivityIndicator size="small" color={Colors.primary} style={{ alignSelf: 'flex-start' }} />
          ) : availableStaff.length === 0 ? (
             <AppText style={styles.emptyText}>No staff available for this service.</AppText>
          ) : (
            <View>
              <Pressable 
                style={[styles.dropdownHeader, isStaffDropdownOpen && styles.dropdownHeaderActive]} 
                onPress={() => {
                  setIsStaffDropdownOpen(!isStaffDropdownOpen);
                  setIsPetDropdownOpen(false);
                }}
              >
                <View style={styles.dropdownHeaderLeft}>
                  <Ionicons name="medkit" size={18} color={selectedStaff ? Colors.primary : '#9CA3AF'} />
                  <AppText style={selectedStaff ? styles.dropdownHeaderTextSelected : styles.dropdownHeaderText}>
                    {selectedStaffName}
                  </AppText>
                </View>
                <Ionicons name={isStaffDropdownOpen ? "chevron-up" : "chevron-down"} size={20} color="#6B7280" />
              </Pressable>

              {isStaffDropdownOpen && (
                <View style={styles.dropdownListWrapper}>
                  <ScrollView nestedScrollEnabled style={styles.dropdownScroll}>
                    {availableStaff.map(staff => (
                      <Pressable 
                        key={staff.staff_id} 
                        style={styles.dropdownItem} 
                        onPress={() => {
                          setSelectedStaff(staff.staff_id);
                          setIsStaffDropdownOpen(false);
                        }}
                      >
                        <AppText style={selectedStaff === staff.staff_id ? styles.dropdownItemTextSelected : styles.dropdownItemText}>
                          {staff.first_name} {staff.last_name} {staff.role ? `• ${staff.role}` : ''}
                        </AppText>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Step 3: Select Date */}
        <View style={[styles.section, { zIndex: 10 }]}>
          <AppText style={styles.sectionTitle}>3. Choose a Date</AppText>
          <Pressable style={styles.dateSelector} onPress={() => {
            setShowDatePicker(true);
            setIsPetDropdownOpen(false); 
            setIsStaffDropdownOpen(false);
          }}>
            <Ionicons name="calendar-outline" size={24} color={Colors.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <AppText style={styles.dateLabel}>Selected Date</AppText>
              <AppText style={styles.dateValue}>{displayDate}</AppText>
            </View>
            <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
          </Pressable>

          {(showDatePicker || Platform.OS === 'ios') && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              minimumDate={new Date()} 
              style={Platform.OS === 'ios' ? { height: 120, marginTop: 10 } : {}}
            />
          )}
        </View>

    
        {/* Step 4: Available Times */}
        <View style={styles.section}>
          <AppText style={styles.sectionTitle}>4. Available Times</AppText>

          {isLimitReached ? (
            <View style={[styles.centerBox, { borderColor: '#EF4444', backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="warning-outline" size={40} color="#EF4444" style={{ marginBottom: 8 }} />
              <AppText style={[styles.closedTitle, { color: '#991B1B' }]}>Fully Booked</AppText>
              <AppText style={[styles.closedText, { color: '#B91C1C' }]}>
                This clinic is currently not accepting new appointments for services. Please check back later.
              </AppText>
            </View>
          ) : !selectedStaff ? (
            <View style={styles.centerBox}>
              <Ionicons name="time-outline" size={40} color="#9CA3AF" style={{ marginBottom: 8 }} />
              <AppText style={styles.closedText}>Select a professional to view their available schedule.</AppText>
            </View>
          ) : loadingTimes ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <AppText style={styles.loadingText}>Checking availability...</AppText>
            </View>
          ) : availableTimes.length === 0 ? (
            <View style={styles.centerBox}>
              <Ionicons name="close-circle-outline" size={40} color="#EF4444" style={{ marginBottom: 8 }} />
              <AppText style={styles.closedTitle}>Not Available</AppText>
              <AppText style={styles.closedText}>{selectedStaffData?.first_name} is not available on this date.</AppText>
            </View>
          ) : (
            <View style={styles.timeGrid}>
              {availableTimes.map((item, index) => {
                const isBooked = !item.is_available;
                return (
                  <Pressable 
                    key={index}
                    disabled={isBooked}
                    style={[
                        styles.timeChip, 
                        selectedTime === item.start && styles.timeChipActive,
                        isBooked && styles.timeChipDisabled
                    ]}
                    onPress={() => setSelectedTime(item.start)}
                  >
                    <AppText style={[
                        styles.timeChipText, 
                        selectedTime === item.start && { color: '#FFF' },
                        isBooked && styles.timeChipTextDisabled
                    ]}>
                      {item.full_display}
                    </AppText>
                    {isBooked && <Ionicons name="lock-closed" size={12} color="#9CA3AF" />}
                  </Pressable>
                )
              })}
            </View>
          )}
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <Pressable 
          style={[styles.submitBtn, (!selectedPet || !selectedStaff || !selectedTime || isSubmitting) && styles.submitBtnDisabled]}
          disabled={!selectedPet || !selectedStaff || !selectedTime || isSubmitting}
          onPress={handleBookAppointment}
        >
          {isSubmitting ? <ActivityIndicator color="#FFF" /> : <AppText style={styles.submitBtnText}>Confirm Booking</AppText>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg50 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: Colors.white, zIndex: 10, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#111827', textAlign: 'center', marginHorizontal: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  section: { marginBottom: 30 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 12 },
  emptyText: { color: '#6B7280', fontStyle: 'italic', marginLeft: 4 },
  dropdownHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.white, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16 },
  dropdownHeaderActive: { borderColor: Colors.primary },
  dropdownHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dropdownHeaderText: { fontSize: 16, color: '#6B7280', fontWeight: '500' },
  dropdownHeaderTextSelected: { fontSize: 16, color: '#111827', fontWeight: '700', textTransform: 'capitalize' },
  dropdownListWrapper: { marginTop: 8, backgroundColor: Colors.white, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, overflow: 'hidden', maxHeight: 220 },
  dropdownScroll: { paddingVertical: 0 },
  dropdownItem: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dropdownItemText: { fontSize: 15, color: '#4B5563', textTransform: 'capitalize' },
  dropdownItemTextSelected: { fontSize: 15, color: Colors.primary, fontWeight: '800', textTransform: 'capitalize' },
  dateSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#D1D5DB' },
  dateLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600', marginBottom: 2 },
  dateValue: { fontSize: 16, fontWeight: '700', color: '#111827' },
  centerBox: { alignItems: 'center', justifyContent: 'center', padding: 30, backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed' },
  loadingText: { marginTop: 10, color: '#6B7280', fontWeight: '500' },
  closedTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  closedText: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 4, lineHeight: 20 },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  timeChip: { width: '48%', backgroundColor: '#FFF', paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', marginBottom: 10, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  timeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  timeChipDisabled: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB', opacity: 0.6 },
  timeChipText: { fontSize: 12, fontWeight: '700', color: '#4B5563' },
  timeChipTextDisabled: { color: '#9CA3AF', textDecorationLine: 'line-through' },
  footer: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: Colors.white, padding: 20, borderTopWidth: 1, borderTopColor: '#E5E7EB', elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  submitBtn: { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: Colors.white, fontSize: 16, fontWeight: '800' },


  serviceHeaderCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  serviceIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceNameText: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 6,
  },
  serviceDescriptionText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'left',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  priceTag: {
    marginTop: 15,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    // Use these for the "flex gap" effect:
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6, // Use a number, not a string
  },
  priceText: {
    color: '#059669',
    fontWeight: '800',
    fontSize: 15,
    // Remove display: flex and gap from here
  },
});