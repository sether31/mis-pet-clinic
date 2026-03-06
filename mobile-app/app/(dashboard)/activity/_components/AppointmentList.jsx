import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Pressable, RefreshControl, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import AppText from '../../../../components/AppText'; 
import AnimatedWrapper from '../../../../components/AnimatedWrapper'; 
import { Colors } from '../../../../constants/Color';
import { authFetch } from '../../../../utils/auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function AppointmentsList({ activeTab }) {
  const router = useRouter(); 
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API_URL}/api/pet-owner/appointments/get-upcoming-appointments.php`);
      if (res?.success) setAppointments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleCancel = (appointmentId) => {
    Alert.alert(
      "Cancel Appointment",
      "Are you sure you want to cancel this booking?",
      [
        { text: "No, keep it", style: "cancel" },
        { 
          text: "Yes, Cancel", 
          style: "destructive",
          onPress: async () => {
            try {
              const res = await authFetch(`${API_URL}/api/pet-owner/appointments/cancel-appointment.php`, {
                method: 'POST',
                body: JSON.stringify({ appointment_id: appointmentId })
              });
              
              if (res?.success) {
                Alert.alert("Success", "Appointment Cancelled.");
                setModalVisible(false); 
                fetchAppointments(); 
              } else {
                Alert.alert("Failed", res?.message || "Something went wrong");
              }
            } catch (error) {
              console.error(error);
              Alert.alert("Error", "Something went wrong");
            }
          }
        }
      ]
    );
  };

  const goToClinicProfile = (branchId) => {
    setModalVisible(false); 
    router.push(`/(dashboard)/clinics/${branchId}?from=activity`); 
  };

  const filteredAppointments = appointments.filter(item => {
    if (activeTab === 'upcoming') {
      return item.status === 'pending' || item.status === 'confirmed';
    } else {
      return item.status === 'completed' || item.status === 'cancelled' || item.status === 'rejected' || item.status === 'billed';
    }
  });

  const getStatusStyle = (status) => {
    switch (status) {
      case 'completed':
      case 'confirmed': return { bg: '#DCFCE7', text: Colors.primary }; 
      case 'billed': return { bg: '#DBEAFE', text: '#1D4ED8' };
      case 'pending': return { bg: '#FEF3C7', text: '#92400E' }; 
      case 'rejected':
      case 'cancelled': return { bg: '#FEE2E2', text: '#991B1B' }; 
      default: return { bg: '#F3F4F6', text: '#374151' }; 
    }
  };

  const formatTimeRange = (start, end) => {
    const startTime = new Date(start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (!end) return startTime; 
    const endTime = new Date(end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${startTime} - ${endTime}`;
  };

  const renderAppointmentCard = ({ item, index }) => {
    const statusStyle = getStatusStyle(item.status);
    const dateObj = new Date(item.start_time);
    
    return (
      <AnimatedWrapper index={index}>
        <Pressable 
          style={({pressed}) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => {
            if(item.status === 'completed' || item.status === 'billed') {
              router.push(`/activity/MedicalRecordDetail?recordId=${item.record_id}`);
            } else {
              setSelectedAppointment(item);
              setModalVisible(true);
            }
          }}
        >
          {({ pressed }) => (
            <>
              <View style={styles.cardHeader}>
                <View style={styles.dateTime}>
                  <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                  <AppText style={styles.dateText}>
                    {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </AppText>
                  <Ionicons name="time-outline" size={14} color="#6B7280" style={{marginLeft: 10}} />
                  <AppText style={styles.dateText}>
                    {formatTimeRange(item.start_time, item.end_time)}
                  </AppText>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                  <AppText style={[styles.statusText, { color: statusStyle.text }]}>{item.status}</AppText>
                </View>
              </View>

              <AppText style={styles.serviceName}>
                {item.service_name || "Custom Service"}
              </AppText>
              <AppText style={styles.clinicName}>{item.branch_name || "Unknown Branch"}</AppText>
              
              <View style={styles.cardFooter}>
                <View style={styles.petInfo}>
                  <Ionicons name="paw" size={16} color={Colors.primary} />
                  <AppText style={styles.petName}>{item.pet_name || "Unknown Pet"}</AppText>
                </View>
                
                <AppText style={[styles.viewDetailsText, pressed && { color: Colors.primary }]}>
                  {item.status === 'completed' || item.status === 'billed' ? "View Medical Record \u2192" : "View Details \u2192"}
                </AppText>
              </View>
            </>
          )}
        </Pressable>
      </AnimatedWrapper>
    );
  };

  return (
    <>
      <FlatList
        data={filteredAppointments}
        keyExtractor={(item) => item.appointment_id.toString()}
        renderItem={renderAppointmentCard}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchAppointments} tintColor={Colors.primary} />}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={60} color="#D1D5DB" />
              <AppText style={styles.emptyTitle}>No vet visits found</AppText>
              <AppText style={styles.emptySub}>Your {activeTab} appointments will appear here.</AppText>
            </View>
          )
        }
      />

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
        statusBarTranslucent={true} 
      >
        <View style={styles.modalOverlay}>
          
          <Pressable style={styles.modalBackgroundClick} onPress={() => setModalVisible(false)} />

          <View style={styles.modalContent}>
            {selectedAppointment && (
              <>
                <View style={styles.modalHeader}>
                  <AppText style={styles.modalTitle}>Appointment Details</AppText>
                  
                  <Pressable onPress={() => setModalVisible(false)}>
                    {({ pressed }) => (
                      <Ionicons 
                        name="close-circle" 
                        size={28} 
                        color={pressed ? "#EF4444" : "#D1D5DB"} 
                      />
                    )}
                  </Pressable>
                </View>

                <View style={styles.modalBody}>
                  <View style={styles.detailRow}>
                    <AppText style={styles.detailLabel}>Reference ID</AppText>
                    <AppText style={styles.detailValue}>#{selectedAppointment.appointment_id}</AppText>
                  </View> 
                  <View style={styles.detailRow}>
                    <AppText style={styles.detailLabel}>Status</AppText>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusStyle(selectedAppointment.status).bg }]}>
                      <AppText style={[styles.statusText, { color: getStatusStyle(selectedAppointment.status).text }]}>
                        {selectedAppointment.status}
                      </AppText>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <AppText style={styles.detailLabel}>Date</AppText>
                    <AppText style={styles.detailValue}>
                      {new Date(selectedAppointment.start_time).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </AppText>
                  </View>

                  <View style={styles.detailRow}>
                    <AppText style={styles.detailLabel}>Time</AppText>
                    <AppText style={styles.detailValue}>
                      {formatTimeRange(selectedAppointment.start_time, selectedAppointment.end_time)}
                    </AppText>
                  </View>

                  <View style={styles.detailRow}>
                    <AppText style={styles.detailLabel}>Service</AppText>
                    <AppText style={[styles.detailValue, { textTransform: 'capitalize' }]}>{selectedAppointment.service_name}</AppText>
                  </View>

                  <View style={styles.detailRow}>
                    <AppText style={styles.detailLabel}>Clinic</AppText>
                    <AppText style={[styles.detailValue, { textTransform: 'capitalize' }]}>{selectedAppointment.branch_name}</AppText>
                  </View>

                  <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                    <AppText style={styles.detailLabel}>Pet</AppText>
                    <AppText style={[styles.detailValue, { textTransform: 'capitalize' }]}>{selectedAppointment.pet_name}</AppText>
                  </View>

                  {(selectedAppointment.status === 'rejected' || selectedAppointment.status === 'cancelled') && selectedAppointment.feedback && (
                    <View style={styles.feedbackBox}>
                      <AppText style={styles.feedbackLabel}>Reason for {selectedAppointment.status}:</AppText>
                      <AppText style={styles.feedbackText}>{selectedAppointment.feedback}</AppText>
                    </View>
                  )}
                </View>

                <Pressable 
                  style={({ pressed }) => [styles.viewClinicBtn, pressed && styles.viewClinicBtnPressed]} 
                  onPress={() => goToClinicProfile(selectedAppointment.branch_id)} 
                >
                  <Ionicons name="business" size={20} color="#FFFFFF" style={{marginRight: 8}}/>
                  <AppText style={styles.viewClinicText}>View Clinic Profile</AppText>
                </Pressable>

                {selectedAppointment.status === 'pending' && (
                  <Pressable 
                    style={({ pressed }) => [
                      styles.modalCancelBtn, 
                      pressed && styles.modalCancelBtnPressed
                    ]} 
                    onPress={() => handleCancel(selectedAppointment.appointment_id)}
                  >
                    {({ pressed }) => (
                      <AppText style={[
                        styles.modalCancelText, 
                        pressed && { color: '#B91C1C' }
                      ]}>
                        Cancel Appointment
                      </AppText>
                    )}
                  </Pressable>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  listContent: { padding: 20, paddingBottom: 40 },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 15, borderWidth: 1, borderColor: Colors.border300 },
  cardPressed: { transform: [{ scale: 0.98 }], borderColor: Colors.primary, backgroundColor: '#F9FAFB' }, 
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dateTime: { flexDirection: 'row', alignItems: 'center' },
  dateText: { fontSize: 12, color: '#6B7280', marginLeft: 4, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  serviceName: { fontSize: 18, fontWeight: '800', color: '#111827', textTransform: 'capitalize' },
  clinicName: { fontSize: 14, color: '#6B7280', marginTop: 2, textTransform: 'capitalize' },
  petName: { fontSize: 14, fontWeight: '700', color: '#4B5563', textTransform: 'capitalize' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  petInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  
  viewDetailsText: { fontSize: 12, color: '#111827', fontWeight: '700' }, 
  
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#4B5563', marginTop: 16 },
  emptySub: { fontSize: 14, color: '#9CA3AF', marginTop: 4, textAlign: 'center', paddingHorizontal: 40 },
  
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackgroundClick: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, minHeight: 400 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  modalBody: { gap: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 12 },
  detailLabel: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  detailValue: { fontSize: 14, color: '#111827', fontWeight: '700' },
  
  viewClinicBtn: { flexDirection: 'row', marginTop: 20, backgroundColor: '#111827', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  viewClinicBtnPressed: { backgroundColor: Colors.primary },
  viewClinicText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },

  modalCancelBtn: { 
    marginTop: 12, 
    backgroundColor: '#FEF2F2', 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2'
  },
  modalCancelBtnPressed: {
    backgroundColor: '#FECACA', 
    borderColor: '#FCA5A5',
    transform: [{ scale: 0.98 }]
  },
  modalCancelText: { color: '#EF4444', fontWeight: '800', fontSize: 16 },
  
  feedbackBox: { backgroundColor: '#FEF2F2', padding: 16, borderRadius: 12, marginTop: 4, borderWidth: 1, borderColor: '#FEE2E2' },
  feedbackLabel: { fontSize: 12, fontWeight: '800', color: '#991B1B', marginBottom: 6, textTransform: 'uppercase' },
  feedbackText: { fontSize: 14, color: '#7F1D1D', fontStyle: 'italic', lineHeight: 20 }
});