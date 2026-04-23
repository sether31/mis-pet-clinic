import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, Modal, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';

import AppText from '../../../../components/AppText';
import { Colors } from '../../../../constants/Color';
import { authFetch } from '../../../../utils/auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function ServicesTab({ services, branchId }) {
  const router = useRouter();

  // Steps: 1:Date, 2:Staff, 3:Pet, 4:Services, 5:Time
  const [currentStep, setCurrentStep] = useState(1);

  // Selection States
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedPet, setSelectedPet] = useState(null);
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedTime, setSelectedTime] = useState('');

  // UI States
  const [viewingService, setViewingService] = useState(null); 
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Data States
  const [myPets, setMyPets] = useState([]);
  const [branchStaff, setBranchStaff] = useState([]);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Helper: Capitalize Service Names
  const formatName = (str) => {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  useEffect(() => {
    fetchPets();
  }, []);

  useEffect(() => {
    if (currentStep <= 2) {
      fetchStaffForDate(selectedDate);
      setSelectedStaff(null); 
    }
  }, [selectedDate]);

  const fetchPets = async () => {
    try {
      const res = await authFetch(`${API_URL}/api/pet-owner/pet/get-pets.php`);
      if (res?.success) setMyPets(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchStaffForDate = async (dateObj) => {
    setLoading(true);
    const dateStr = dateObj.toISOString().split('T')[0];
    try {
      const res = await authFetch(`${API_URL}/api/pet-owner/appointments/get-service-staff.php?branch_id=${branchId}&branch_service_id=all&date=${dateStr}`);
      if (res?.success) setBranchStaff(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const getStaffExpertise = (staffRole) => {
    let role = staffRole?.toLowerCase();
    if (role === 'branch manager') role = 'branch_admin';

    return services.filter(s => {
      try {
        if (!s.assigned_role) return false; 
        const roles = s.assigned_role.startsWith('[') 
          ? JSON.parse(s.assigned_role) 
          : [s.assigned_role];
        return roles.map(r => r.toLowerCase()).includes(role);
      } catch (e) { return false; }
    });
  };

  const totalDuration = selectedServices.reduce((acc, s) => acc + parseInt(s.duration || 0), 0);
  const totalPrice = selectedServices.reduce((acc, s) => acc + parseFloat(s.price || 0), 0);

  useEffect(() => {
    if (currentStep === 5) fetchTimes();
  }, [currentStep]);

  const fetchTimes = async () => {
    setLoading(true);
    const dateStr = selectedDate.toISOString().split('T')[0];
    const sIds = selectedServices.map(s => s.branch_service_id).join(',');
    try {
      const res = await authFetch(
        `${API_URL}/api/pet-owner/appointments/get-available-times.php?branch_id=${branchId}&staff_id=${selectedStaff.staff_id}&date=${dateStr}&service_ids=${sIds}`
      );
      
      // NEW: Maintenance Kick-out trigger
      if (res?.maintenance) {
        Alert.alert("Branch Unavailable", res.message, [
            { text: "OK", onPress: () => router.replace('/') } // Adjust route to your home/clinic list
        ]);
        return;
      }

      if (res?.success) {
          setAvailableTimes(res.data);
      } else {
          Alert.alert("Error", res.message || "Failed to load times.");
      }

    } catch (e) { 
        console.error("Fetch Error:", e); 
        Alert.alert("Error", "Network connection failed.");
    } 
    finally { setLoading(false); }
  };

  const getLocalDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

  const handleBookingSubmit = async () => {
    if (!selectedPet || !selectedStaff || !selectedTime) {
        Alert.alert("Missing Info", "Please ensure pet, staff, and time are selected.");
        return;
    }

    setLoading(true);
    try {
      // FIX: Get local date YYYY-MM-DD without timezone shifting
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const localDateStr = `${year}-${month}-${day}`;

      const res = await authFetch(`${API_URL}/api/pet-owner/appointments/create-appointment.php`, {
        method: 'POST',
        body: JSON.stringify({
          branch_id: branchId,
          pet_id: selectedPet.pet_id,
          staff_id: selectedStaff.staff_id,
          // Sending as array - Ensure your PHP loops through this!
          service_ids: selectedServices.map(s => s.branch_service_id),
          appointment_date: getLocalDateString(selectedDate),
          appointment_time: selectedTime,
          total_price: totalPrice,
          total_duration: totalDuration
        })
      });

      if (res?.success) {
        Toast.show({ type: 'success', text1: 'Success!', text2: 'Booking request sent.' });
          setSelectedDate(new Date());
          setSelectedStaff(null);
          setSelectedPet(null);
          setSelectedServices([]);
          setSelectedTime('');
          setCurrentStep(1);
        } else {
        Alert.alert("Booking Failed", res?.message || "The server rejected the request.");
      }
    } catch (e) { 
        console.error("Submit Error:", e);
        Alert.alert("Error", "Check your connection or server logs."); 
    } 
    finally { setLoading(false); }
  };

  const openServiceDetails = (service) => {
    setViewingService(service);
    setIsModalVisible(true);
  };

  const renderStepper = () => (
    <View style={styles.stepper}>
      {['Date', 'Staff', 'Pet', 'Services', 'Time'].map((label, i) => (
        <React.Fragment key={i}>
          <View style={styles.stepPoint}>
            <View style={[styles.circle, currentStep >= i + 1 && styles.circleActive]}>
              <AppText style={[styles.stepNum, currentStep >= i + 1 && { color: '#FFF' }]}>{i + 1}</AppText>
            </View>
            <AppText style={[styles.stepLabel, currentStep === i + 1 && styles.stepLabelActive]}>{label}</AppText>
          </View>
          {i < 4 && <View style={[styles.line, currentStep > i + 1 && styles.lineActive]} />}
        </React.Fragment>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      
      {/* SERVICE DETAILS MODAL */}
      <Modal visible={isModalVisible} transparent animationType="fade" onRequestClose={() => setIsModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setIsModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <AppText style={[styles.modalTitle, { textTransform: 'capitalize' }]}>{formatName(viewingService?.custom_name)}</AppText>
                  <Pressable onPress={() => setIsModalVisible(false)}>
                    <Ionicons name="close-circle" size={28} color="#9CA3AF" />
                  </Pressable>
                </View>
                
                <View style={styles.modalBody}>
                  <View style={styles.modalPriceBadge}>
                    <AppText style={styles.modalPriceLabel}>Service Price</AppText>
                    <AppText style={styles.modalPriceValue}>₱{parseFloat(viewingService?.price || 0).toLocaleString()}</AppText>
                  </View>

                  <AppText style={styles.modalDescHeader}>About this service</AppText>
                  <AppText style={styles.modalDescText}>
                    {viewingService?.description || "No description provided for this service."}
                  </AppText>

                  <View style={styles.modalDurationRow}>
                    <Ionicons name="time-outline" size={18} color="#6B7280" />
                    <AppText style={styles.modalDurationText}>Estimated Duration: {viewingService?.duration} mins</AppText>
                  </View>
                </View>

                <Pressable style={styles.modalCloseBtn} onPress={() => setIsModalVisible(false)}>
                  <AppText style={styles.modalCloseBtnText}>Close Details</AppText>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* TOP CAROUSEL */}
      <View style={styles.browseWrap}>
        <AppText style={styles.browseHeader}>Quick Browse: Our Services</AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carousel}>
          {services.map((item, index) => (
            <Pressable key={index} style={styles.carouselCard} onPress={() => openServiceDetails(item)}>
              <AppText style={[styles.carouselName, { textTransform: 'capitalize' }]} numberOfLines={1}>{formatName(item.custom_name)}</AppText>
              <AppText style={styles.carouselPrice}>₱{parseFloat(item.price).toLocaleString()}</AppText>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {renderStepper()}

      <View style={styles.formCard}>
        {currentStep === 1 && (
          <View>
            <AppText style={styles.cardTitle}>Pick a Date</AppText>
            <Pressable style={styles.dateSelector} onPress={() => setShowDatePicker(true)}>
              <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
              <AppText style={styles.dateText}>{selectedDate.toDateString()}</AppText>
            </Pressable>
            {showDatePicker && (
              <DateTimePicker value={selectedDate} minimumDate={new Date()} onChange={(e, d) => { setShowDatePicker(false); if(d) setSelectedDate(d); }} />
            )}
            <Pressable style={styles.nextBtn} onPress={() => setCurrentStep(2)}>
              <AppText style={styles.nextBtnText}>Next</AppText>
            </Pressable>
          </View>
        )}

        {currentStep === 2 && (
          <View>
            <AppText style={styles.cardTitle}>Select Professional</AppText>
            {loading ? <ActivityIndicator color={Colors.primary} /> : branchStaff.map(staff => {
              const skills = getStaffExpertise(staff.role);
              const isActive = selectedStaff?.staff_id === staff.staff_id;
              const isOffDuty = !staff.is_available_today;

              return (
                <Pressable 
                  key={staff.staff_id}
                  disabled={isOffDuty}
                  onPress={() => { setSelectedStaff(staff); setSelectedServices([]); }}
                  style={[
                    styles.staffCard, 
                    isActive && styles.staffCardActive,
                    isOffDuty && styles.staffCardDisabled 
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <AppText style={[styles.staffName, isActive && { color: '#FFF' }, isOffDuty && { color: '#9CA3AF' }]}>
                            {staff.first_name} {staff.last_name}
                        </AppText>
                        {isOffDuty && (
                            <View style={styles.dayOffBadge}>
                                <AppText style={styles.dayOffText}>Day Off</AppText>
                            </View>
                        )}
                    </View>
                    <AppText style={[styles.staffRole, isActive && { color: '#E5E7EB' }, isOffDuty && { color: '#D1D5DB' }]}>{staff.role}</AppText>
                    
                    <View style={styles.skillsBox}>
                      {skills.map((s, idx) => (
                        <View key={idx} style={[styles.skillTag, isActive && { backgroundColor: 'rgba(255,255,255,0.2)' }, isOffDuty && { backgroundColor: '#F9FAFB' }]}>
                          <AppText style={[styles.skillTxt, isActive && { color: '#FFF' }, isOffDuty && { color: '#D1D5DB' }, { textTransform: 'capitalize' }]}>{formatName(s.custom_name)}</AppText>
                        </View>
                      ))}
                    </View>
                  </View>
                  {isActive && <Ionicons name="checkmark-circle" size={24} color="#FFF" />}
                  {isOffDuty && <Ionicons name="close-circle" size={24} color="#E5E7EB" />}
                </Pressable>
              );
            })}
            <View style={styles.btnRow}>
              <Pressable style={styles.backBtn} onPress={() => setCurrentStep(1)}><AppText>Back</AppText></Pressable>
              <Pressable style={[styles.nextBtn, !selectedStaff && styles.btnDisabled]} disabled={!selectedStaff} onPress={() => setCurrentStep(3)}>
                <AppText style={styles.nextBtnText}>Next</AppText>
              </Pressable>
            </View>
          </View>
        )}

        {currentStep === 3 && (
          <View>
            <AppText style={styles.cardTitle}>Select Your Pet</AppText>
            <View style={styles.petWrap}>
              {myPets.map(pet => (
                <Pressable key={pet.pet_id} onPress={() => setSelectedPet(pet)} style={[styles.petBtn, selectedPet?.pet_id === pet.pet_id && styles.petBtnActive]}>
                  <AppText style={[styles.petBtnTxt, selectedPet?.pet_id === pet.pet_id && { color: '#FFF' }]}>{pet.name}</AppText>
                </Pressable>
              ))}
            </View>
            <View style={styles.btnRow}>
              <Pressable style={styles.backBtn} onPress={() => setCurrentStep(2)}><AppText>Back</AppText></Pressable>
              <Pressable style={[styles.nextBtn, !selectedPet && styles.btnDisabled]} disabled={!selectedPet} onPress={() => setCurrentStep(4)}>
                <AppText style={styles.nextBtnText}>Next</AppText>
              </Pressable>
            </View>
          </View>
        )}

        {currentStep === 4 && (
          <View>
            <AppText style={styles.cardTitle}>Select Services</AppText>
            {services.map(item => {
              const expertise = getStaffExpertise(selectedStaff?.role);
              const isCompatible = expertise.some(s => s.branch_service_id === item.branch_service_id);
              const isSelected = selectedServices.some(s => s.branch_service_id === item.branch_service_id);
              
              return (
                <Pressable 
                  key={item.branch_service_id}
                  disabled={!isCompatible}
                  onPress={() => isSelected ? setSelectedServices(selectedServices.filter(s => s.branch_service_id !== item.branch_service_id)) : setSelectedServices([...selectedServices, item])}
                  style={[styles.serviceItem, isSelected && styles.serviceItemActive, !isCompatible && { opacity: 0.4 }]}
                >
                  <View style={{ flex: 1 }}>
                    <AppText style={[styles.sName, { textTransform: 'capitalize' }]}>{formatName(item.custom_name)}</AppText>
                    <AppText style={styles.sPrice}>₱{item.price} • {item.duration}m</AppText>
                  </View>
                  <Ionicons name={isSelected ? "checkbox" : (isCompatible ? "square-outline" : "lock-closed")} size={22} color={isCompatible ? Colors.primary : "#9CA3AF"} />
                </Pressable>
              );
            })}
            <View style={styles.btnRow}>
              <Pressable style={styles.backBtn} onPress={() => setCurrentStep(3)}><AppText>Back</AppText></Pressable>
              <Pressable style={[styles.nextBtn, selectedServices.length === 0 && styles.btnDisabled]} disabled={selectedServices.length === 0} onPress={() => setCurrentStep(5)}>
                <AppText style={styles.nextBtnText}>Check Slots</AppText>
              </Pressable>
            </View>
          </View>
        )}

        {currentStep === 5 && (
          <View>
            <AppText style={styles.cardTitle}>Available Times</AppText>
            {loading ? <ActivityIndicator color={Colors.primary} /> : (
              <View style={styles.timeGrid}>
                {availableTimes.map((t, i) => (
                  <Pressable 
                    key={i} 
                    disabled={!t.is_available} 
                    onPress={() => setSelectedTime(t.start)}
                    style={[
                      styles.timeSlot, 
                      selectedTime === t.start && styles.timeSlotActive, 
                      !t.is_available && styles.timeSlotLocked
                    ]}
                  >
                    <AppText style={[
                      styles.timeLabel, 
                      !t.is_available && styles.timeLabelLocked, 
                      selectedTime === t.start && { color: '#FFF' }
                    ]}>
                      {t.display_range}
                    </AppText>
                    {!t.is_available && <Ionicons name="lock-closed" size={12} color="#D1D5DB" style={{ marginLeft: 5 }} />}
                  </Pressable>
                ))}
              </View>
            )}
            <View style={styles.btnRow}>
              <Pressable style={styles.backBtn} onPress={() => setCurrentStep(4)}><AppText>Back</AppText></Pressable>
              <Pressable style={[styles.confirmBtn, !selectedTime && styles.btnDisabled]} disabled={!selectedTime} onPress={handleBookingSubmit}>
                <AppText style={styles.confirmBtnText}>Confirm Appointment</AppText>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', width: '100%', borderRadius: 24, padding: 25, elevation: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#111827', flex: 1, marginRight: 10 },
  modalBody: { marginBottom: 25 },
  modalPriceBadge: { backgroundColor: '#F3F4F6', padding: 15, borderRadius: 14, marginBottom: 20 },
  modalPriceLabel: { fontSize: 12, color: '#6B7280', fontWeight: '700' },
  modalPriceValue: { fontSize: 24, fontWeight: '900', color: Colors.primary },
  modalDescHeader: { fontSize: 14, fontWeight: '800', color: '#374151', marginBottom: 8 },
  modalDescText: { fontSize: 15, color: '#4B5563', lineHeight: 22 },
  modalDurationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 8 },
  modalDurationText: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  modalCloseBtn: { backgroundColor: Colors.primary, padding: 16, borderRadius: 14, alignItems: 'center' },
  modalCloseBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },

  // Browsing Carousel
  browseWrap: { padding: 20 },
  browseHeader: { fontSize: 13, fontWeight: '800', color: '#9CA3AF', marginBottom: 12, letterSpacing: 0.5 },
  carousel: { flexDirection: 'row' },
  carouselCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginRight: 12, width: 150, borderWidth: 1, borderColor: '#D1D5DB' },
  carouselName: { fontSize: 13, fontWeight: '700', color: '#1F2937' },
  carouselPrice: { fontSize: 12, color: Colors.primary, fontWeight: '900', marginTop: 5 },

  // Stepper
  stepper: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 30, marginBottom: 25 },
  stepPoint: { alignItems: 'center' },
  circle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  circleActive: { backgroundColor: Colors.primary },
  stepNum: { fontSize: 12, fontWeight: '800', color: '#9CA3AF' },
  stepLabel: { fontSize: 9, color: '#9CA3AF', marginTop: 4, fontWeight: '700' },
  stepLabelActive: { color: Colors.primary },
  line: { flex: 1, height: 2, backgroundColor: '#E5E7EB', marginHorizontal: 6, marginTop: -15 },
  lineActive: { backgroundColor: Colors.primary },

  // Form Card
  formCard: { backgroundColor: '#FFF', marginHorizontal: 20, padding: 25, borderRadius: 24, borderWidth: 1, borderColor: '#D1D5DB', marginBottom: 40 },
  cardTitle: { fontSize: 20, fontWeight: '900', color: '#111827', marginBottom: 20 },

  dateSelector: { flexDirection: 'row', alignItems: 'center', padding: 18, backgroundColor: '#F3F4F6', borderRadius: 14, marginBottom: 15 },
  dateText: { marginLeft: 12, fontWeight: '700', fontSize: 15 },

  // Staff Card (Improved Borders)
  staffCard: { padding: 18, borderRadius: 16, borderWidth: 1.5, borderColor: '#D1D5DB', marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  staffCardActive: { backgroundColor: Colors.primary, borderColor: Colors.primary, borderWidth: 1 }, 
  staffCardDisabled: { backgroundColor: '#F9FAFB', opacity: 0.8 },
  staffName: { fontSize: 16, fontWeight: '800' },
  staffRole: { fontSize: 12, color: '#6B7280', marginBottom: 10 },
  skillsBox: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  skillTag: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  skillTxt: { fontSize: 10, fontWeight: '700', color: '#4B5563' },
  dayOffBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  dayOffText: { fontSize: 10, fontWeight: '800', color: '#EF4444' },

  petWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  petBtn: { padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', width: '47%' },
  petBtnActive: { backgroundColor: Colors.primary  },
  petBtnTxt: { textAlign: 'center', fontWeight: '800' },

  serviceItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  serviceItemActive: { backgroundColor: '#EFF6FF', paddingHorizontal: 15, borderRadius: 14, marginBottom: 5 },
  sName: { fontWeight: '700', fontSize: 16 },
  sPrice: { fontSize: 13, color: '#6B7280' },

  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  timeSlot: { width: '48%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12 },
  timeSlotActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  timeSlotLocked: { backgroundColor: '#F9FAFB', borderColor: '#F3F4F6' },
  timeLabel: { fontSize: 12, fontWeight: '800', color: '#374151' },
  timeLabelLocked: { color: '#D1D5DB', textDecorationLine: 'line-through' },

  btnRow: { flexDirection: 'row', gap: 12, marginTop: 30 },
  backBtn: { flex: 1, padding: 16, alignItems: 'center', borderRadius: 14, backgroundColor: '#F3F4F6' },
  nextBtn: { flex: 2, backgroundColor: Colors.primary, padding: 16, borderRadius: 14, alignItems: 'center' },
  nextBtnText: { color: '#FFF', fontWeight: '800' },
  confirmBtn: { flex: 2, backgroundColor: Colors.primary, padding: 16, borderRadius: 14, alignItems: 'center' },
  confirmBtnText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  btnDisabled: { opacity: 0.5 }
});