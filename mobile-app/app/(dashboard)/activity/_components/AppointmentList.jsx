import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Pressable, RefreshControl, Alert, Modal, ActivityIndicator, ScrollView} from 'react-native';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser'; 

import AppText from '../../../../components/AppText'; 
import AnimatedWrapper from '../../../../components/AnimatedWrapper'; 
import { Colors } from '../../../../constants/Color';
import { authFetch } from '../../../../utils/auth';
import Toast from 'react-native-toast-message';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function AppointmentsList({ activeTab }) {
  const router = useRouter(); 
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isPaying, setIsPaying] = useState(false); 
  const [showPaymentSelector, setShowPaymentSelector] = useState(false); 

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

  const handlePayNow = async (appointmentId, method) => {
    setIsPaying(true);
    try {
      const returnUrl = Linking.createURL('/'); 

      const res = await authFetch(`${API_URL}/api/pet-owner/appointments/appointment-payment.php`, {
        method: 'POST',
        body: JSON.stringify({ 
          appointment_id: appointmentId, 
          payment_method: method,
          return_url: returnUrl 
        }) 
      });

      if(res?.success && res?.checkout_url) {
        
        // USE openAuthSessionAsync  This opens the browser, but AUTOMATICALLY closes it when Xendit redirects to returnUrl
        await WebBrowser.openAuthSessionAsync(res.checkout_url, returnUrl);
        
        // Once it auto-closes, verify the payment!
        const verifyRes = await authFetch(`${API_URL}/api/pet-owner/appointments/verify-appointment-payment.php`, {
          method: 'POST',
          body: JSON.stringify({ appointment_id: appointmentId })
        });

        if (verifyRes?.success) {
          Toast.show({ type: 'success', text1: 'Payment Successful!', text2: 'Your appointment is now completed.' });
        } else {
          Toast.show({ type: 'info', text1: 'Payment Incomplete', text2: 'You can try again later.' });
        }

        fetchAppointments();
        setModalVisible(false);
        setShowPaymentSelector(false); 
      } else {
        Alert.alert("Payment Error", res?.message || "Could not generate payment link.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Something went wrong while connecting to the payment gateway.");
    } finally {
      setIsPaying(false);
    }
  };

  const goToClinicProfile = (appointment) => {
    if (!appointment?.branch_id) return;

    if (
      appointment.is_maintenance == 1 || 
      appointment.clinic_status !== 'approved' || 
      appointment.has_active_sub == 0
    ) {
      setModalVisible(false);
      Toast.show({ 
        type: 'info', 
        text1: 'Clinic Unavailable', 
        text2: 'This clinic is currently under maintenance or unavailable.',
        visibilityTime: 4000 
      });
      return; 
    }

    setModalVisible(false); 
    router.push(`/(dashboard)/clinics/${appointment.branch_id}?from=activity`); 
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
            if(item.status === 'completed') {
              router.push(`/(dashboard)/pets/record/${item.record_id}?from=activity`);
              
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
                  {item.status === 'completed' ? "View Medical Record \u2192" : "View Details \u2192"}
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
        onRequestClose={() => {
          setModalVisible(false);
          setShowPaymentSelector(false); 
        }}
        statusBarTranslucent={true} 
      >
        <View style={styles.modalOverlay}>
          
          <Pressable style={styles.modalBackgroundClick} onPress={() => {
            setModalVisible(false);
            setShowPaymentSelector(false); 
          }} />

          <View style={styles.modalContent}>
            {selectedAppointment && (
              <>
                <View style={styles.modalHeader}>
                  <AppText style={styles.modalTitle}>
                    {showPaymentSelector ? "Select Payment Method" : "Appointment Details"}
                  </AppText>
                  
                  <Pressable onPress={() => {
                    setModalVisible(false);
                    setShowPaymentSelector(false);
                  }}>
                    {({ pressed }) => (
                      <Ionicons 
                        name="close-circle" 
                        size={28} 
                        color={pressed ? "#EF4444" : "#D1D5DB"} 
                      />
                    )}
                  </Pressable>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false} 
                  contentContainerStyle={{ paddingBottom: 20 }}
                  bounces={false}
                >
                  {/* payment method */}
                  {showPaymentSelector ? (
                    <View style={{ gap: 16, marginTop: 20 }}>
                      {isPaying ? (
                        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                          <ActivityIndicator size="large" color={Colors.primary} />
                        </View>
                      ) : (
                        <>
                          <Pressable 
                            style={({ pressed }) => [styles.walletBtn, { backgroundColor: '#005CEE' }, pressed && styles.walletBtnPressed]}
                            onPress={() => handlePayNow(selectedAppointment.appointment_id, 'GCASH')}
                          >
                            <Ionicons name="wallet-outline" size={24} color="#FFF" style={{ marginRight: 10 }} />
                            <AppText style={styles.walletBtnText}>Pay with GCash</AppText>
                          </Pressable>

                          <Pressable 
                            style={({ pressed }) => [styles.walletBtn, { backgroundColor: Colors.primary }, pressed && styles.walletBtnPressed]}
                            onPress={() => handlePayNow(selectedAppointment.appointment_id, 'PAYMAYA')}
                          >
                            <Ionicons name="card-outline" size={24} color="#FFF" style={{ marginRight: 10 }} />
                            <AppText style={styles.walletBtnText}>Pay with Maya</AppText>
                          </Pressable>

                          <Pressable style={styles.backLink} onPress={() => setShowPaymentSelector(false)}>
                            <AppText style={styles.backLinkText}>← Back to details</AppText>
                          </Pressable>
                        </>
                      )}
                    </View>
                  ) : (
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
                        <AppText style={styles.detailLabel}>Service Fee</AppText>
                        <AppText style={[styles.detailValue, { color: Colors.primary }]}>
                          ₱{parseFloat(selectedAppointment.service_fee || 0).toFixed(2)}
                        </AppText>
                      </View>

                      <View style={styles.detailRow}>
                        <AppText style={styles.detailLabel}>Clinic</AppText>
                        <AppText style={[styles.detailValue, { textTransform: 'capitalize' }]}>{selectedAppointment.branch_name}</AppText>
                      </View>

                      <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                        <AppText style={styles.detailLabel}>Pet</AppText>
                        <AppText style={[styles.detailValue, { textTransform: 'capitalize' }]}>{selectedAppointment.pet_name}</AppText>
                      </View>

                      {selectedAppointment.total_amount && (
                        <View style={styles.receiptContainer}>
                          <AppText style={styles.receiptTitle}>Final Bill Breakdown</AppText>
                          
                          {(selectedAppointment.items || []).map((item, idx) => (
                            <View key={idx} style={styles.receiptItemRow}>
                              <View style={{flex: 1, paddingRight: 10}}>
                                <AppText style={styles.receiptItemName}>{item.item_name}</AppText>
                                <AppText style={styles.receiptItemQty}>
                                  {item.quantity} x ₱{parseFloat(item.price).toFixed(2)}
                                </AppText>
                              </View>
                              <AppText style={styles.receiptItemSubtotal}>
                                ₱{parseFloat(item.subtotal).toFixed(2)}
                              </AppText>
                            </View>
                          ))}

                          {/* Total Row */}
                          <View style={styles.receiptTotalRow}>
                            <AppText style={styles.receiptTotalLabel}>Final Total</AppText>
                            <AppText style={styles.receiptTotalValue}>
                              ₱{parseFloat(selectedAppointment.total_amount).toFixed(2)}
                            </AppText>
                          </View>
                        </View>
                      )}

                      {(selectedAppointment.status === 'rejected' || selectedAppointment.status === 'cancelled') && selectedAppointment.feedback && (
                        <View style={styles.feedbackBox}>
                          <AppText style={styles.feedbackLabel}>Reason for {selectedAppointment.status}:</AppText>
                          <AppText style={styles.feedbackText}>{selectedAppointment.feedback}</AppText>
                        </View>
                      )}
                    </View> 
                  )}

                  {/* BOTTOM BUTTONS */}
                  {!showPaymentSelector && (
                    <View style={{ marginTop: 10 }}>
                      {selectedAppointment.status === 'billed' && (
                        <Pressable 
                          style={({ pressed }) => [styles.payBtn, pressed && styles.payBtnPressed]} 
                          onPress={() => setShowPaymentSelector(true)}
                        >
                          <Ionicons name="card-outline" size={20} color="#FFFFFF" style={{marginRight: 8}}/>
                          <AppText style={styles.payBtnText}>Pay Online</AppText>
                        </Pressable>
                      )}

                      {selectedAppointment.record_id && selectedAppointment.status !== 'completed' && (
                        <Pressable 
                          style={({ pressed }) => [
                            styles.viewClinicBtn, 
                            { backgroundColor: '#4F46E5', marginBottom: -4 },
                            pressed && { transform: [{ scale: 0.98 }] }
                          ]} 
                          onPress={() => {
                            setModalVisible(false); 
                            router.push(`/(dashboard)/pets/record/${selectedAppointment.record_id}?from=activity`); 
                          }}
                        >
                          <Ionicons name="document-text" size={20} color="#FFFFFF" style={{marginRight: 8}}/>
                          <AppText style={styles.viewClinicText}>Review Medical Record</AppText>
                        </Pressable>
                      )}

                      <Pressable 
                        style={({ pressed }) => [styles.viewClinicBtn, pressed && styles.viewClinicBtnPressed]} 
                        onPress={() => goToClinicProfile(selectedAppointment)} 
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
                    </View>
                  )}
                </ScrollView>
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
  
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, minHeight: 400, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  modalBody: { gap: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 12 },
  detailLabel: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  detailValue: { fontSize: 14, color: '#111827', fontWeight: '700' },

  payBtn: { flexDirection: 'row', marginTop: 20, backgroundColor: '#2563EB', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  payBtnPressed: { backgroundColor: '#1D4ED8', transform: [{ scale: 0.98 }] },
  payBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 16, letterSpacing: 0.5 },
  
  viewClinicBtn: { flexDirection: 'row', marginTop: 12, backgroundColor: '#111827', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  viewClinicBtnPressed: { backgroundColor: Colors.primary, transform: [{ scale: 0.98 }] },
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
  feedbackText: { fontSize: 14, color: '#7F1D1D', fontStyle: 'italic', lineHeight: 20 },

  // Receipt Styles
  receiptContainer: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, marginTop: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  receiptTitle: { fontSize: 13, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5 },
  receiptItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  receiptItemName: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
  receiptItemQty: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  receiptItemSubtotal: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  receiptTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#CBD5E1' },
  receiptTotalLabel: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  receiptTotalValue: { fontSize: 18, fontWeight: '900', color: Colors.primary },

  // Styles for the Wallet Selection Buttons
  walletBtn: { flexDirection: 'row', padding: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 } },
  walletBtnPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  walletBtnText: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  backLink: { alignItems: 'center', marginTop: 10, paddingVertical: 10 },
  backLinkText: { color: '#6B7280', fontSize: 14, fontWeight: '700' }
});