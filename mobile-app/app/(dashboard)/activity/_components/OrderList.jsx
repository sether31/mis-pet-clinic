import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Pressable, RefreshControl, Alert, Modal, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message'; 

import AppText from '../../../../components/AppText'; 
import AnimatedWrapper from '../../../../components/AnimatedWrapper'; 
import { Colors } from '../../../../constants/Color';
import { authFetch } from '../../../../utils/auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const NO_IMAGE = require('../../../../assets/images/no-image.jpg');

export default function OrderList({ activeTab }) {
  const router = useRouter(); 
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API_URL}/api/pet-owner/shop/get-reservation-records.php`);
      if (res?.success) setOrders(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCancel = (orderId) => {
    Alert.alert(
      "Cancel Reservation",
      "Return this item to clinic stock?",
      [
        { text: "No", style: "cancel" },
        { 
          text: "Yes, Cancel", 
          style: "destructive",
          onPress: async () => {
            try {
              const res = await authFetch(`${API_URL}/api/pet-owner/shop/cancel-reservation.php`, {
                method: 'POST',
                body: JSON.stringify({ order_id: orderId })
              });
              if (res?.success) {
                setModalVisible(false);
                Toast.show({
                  type: 'success',
                  text1: 'Reservation Cancelled',
                  text2: `Order #${orderId} has been successfully cancelled.`
                });
                fetchOrders(); 
              } else {
                Toast.show({
                  type: 'error',
                  text1: 'Cancellation Failed',
                  text2: res?.message || 'Something went wrong'
                });
              }
            } catch (error) {
              console.error(error);
            }
          }
        }
      ]
    );
  };

  const goToProduct = (item) => {
    setModalVisible(false);
    router.push(`/(dashboard)/clinics/product/${item.product_id}?branch_id=${item.branch_id}&from=activity`);
  };

  const filteredOrders = orders.filter(item => {
    if (activeTab === 'upcoming') {
      return item.order_status === 'pending';
    } else {
      return item.order_status === 'completed' || item.order_status === 'cancelled';
    }
  });

  const getStatusStyle = (status) => {
    switch (status) {
      case 'completed': return { bg: '#DCFCE7', text: Colors.primary, label: 'Picked Up' }; 
      case 'pending': return { bg: '#FEF3C7', text: '#92400E', label: 'Awaiting Pickup' }; 
      case 'cancelled': return { bg: '#FEE2E2', text: '#991B1B', label: 'Cancelled' }; 
      default: return { bg: '#F3F4F6', text: '#374151', label: status }; 
    }
  };

  const renderOrderCard = ({ item, index }) => {
    const statusStyle = getStatusStyle(item.order_status);
    const dateObj = new Date(item.pickup_date);
    
    return (
      <AnimatedWrapper index={index}>
        <Pressable 
          style={({pressed}) => [
            styles.card, 
            pressed && styles.cardPressed
          ]}
          onPress={() => {
            setSelectedOrder(item);
            setModalVisible(true);
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
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, marginTop: 4 }]}>
                    <AppText style={[styles.statusText, { color: statusStyle.text }]}>{statusStyle.label}</AppText>
                  </View>
                </View>
              </View>

              <View style={styles.productRow}>
                <Image 
                  source={item.prod_pic ? { uri: `${API_URL}/${item.prod_pic}` } : NO_IMAGE} 
                  style={styles.prodImg} 
                />
                <View style={{flex: 1}}>
                  <AppText style={styles.serviceName}>
                    {item.product_name}
                  </AppText>
                  <AppText style={styles.clinicName}>{item.branch_name}</AppText>
                </View>
              </View>
              
              <View style={styles.cardFooter}>
                <View style={styles.petInfo}>
                  <AppText style={styles.qtyText}>Qty: {item.quantity}</AppText>
                  <AppText style={styles.priceText}>₱{parseFloat(item.total_amount).toFixed(2)}</AppText>
                </View>
                
                <AppText style={[styles.viewDetailsText, pressed && { color: Colors.primary }]}>
                  View Details {"\u2192"}
                </AppText>
              </View>
            </>
          )}
        </Pressable>
      </AnimatedWrapper>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.order_id.toString()}
        renderItem={renderOrderCard}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchOrders} tintColor={Colors.primary} />}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <Ionicons name="bag-handle-outline" size={60} color="#D1D5DB" />
              <AppText style={styles.emptyTitle}>No orders found</AppText>
              <AppText style={styles.emptySub}>Your {activeTab} product reservations will appear here.</AppText>
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
            {selectedOrder && (
              <>
                <View style={styles.modalHeader}>
                  <AppText style={styles.modalTitle}>Order Details</AppText>
                  
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
                    <AppText style={styles.detailValue}>#{selectedOrder.order_id}</AppText>
                  </View>

                  <View style={styles.detailRow}>
                    <AppText style={styles.detailLabel}>Status</AppText>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusStyle(selectedOrder.order_status).bg }]}>
                      <AppText style={[styles.statusText, { color: getStatusStyle(selectedOrder.order_status).text }]}>
                        {getStatusStyle(selectedOrder.order_status).label}
                      </AppText>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <AppText style={styles.detailLabel}>Pickup Date</AppText>
                    <AppText style={styles.detailValue}>
                      {new Date(selectedOrder.pickup_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </AppText>
                  </View>

                  <View style={styles.detailRow}>
                    <AppText style={styles.detailLabel}>Total Amount</AppText>
                    <AppText style={[styles.detailValue, {color: Colors.primary}]}>₱{parseFloat(selectedOrder.total_amount).toFixed(2)}</AppText>
                  </View>

                  <View style={styles.detailRow}>
                    <AppText style={styles.detailLabel}>Product</AppText>
                    <AppText style={styles.detailValue}>{selectedOrder.product_name} (x{selectedOrder.quantity})</AppText>
                  </View>

                  {selectedOrder.order_status === 'cancelled' && selectedOrder.cancellation_reason && (
                    <View style={styles.feedbackBox}>
                      <AppText style={styles.feedbackLabel}>Cancellation Reason:</AppText>
                      <AppText style={styles.feedbackText}>{selectedOrder.cancellation_reason}</AppText>
                    </View>
                  )}
                </View>

                <Pressable 
                  style={({ pressed }) => [styles.viewClinicBtn, pressed && styles.viewClinicBtnPressed]} 
                  onPress={() => goToProduct(selectedOrder)} 
                >
                  <Ionicons name="cart" size={20} color="#FFFFFF" style={{marginRight: 8}}/>
                  <AppText style={styles.viewClinicText}>View Product Page</AppText>
                </Pressable>

                {selectedOrder.order_status === 'pending' && (
                  <Pressable 
                    style={({ pressed }) => [
                      styles.modalCancelBtn, 
                      pressed && styles.modalCancelBtnPressed
                    ]} 
                    onPress={() => handleCancel(selectedOrder.order_id)}
                  >
                    {({ pressed }) => (
                      <AppText style={[
                        styles.modalCancelText, 
                        pressed && { color: '#B91C1C' }
                      ]}>
                        Cancel Reservation
                      </AppText>
                    )}
                  </Pressable>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: { padding: 20, paddingBottom: 40 },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 15, borderWidth: 1, borderColor: Colors.border300 },
  cardPressed: { transform: [{ scale: 0.98 }], borderColor: Colors.primary, backgroundColor: '#F9FAFB' }, 
  
  // 💥 FIX: Matched header alignment to AppointmentsList
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }, 
  dateTime: { flexDirection: 'row', alignItems: 'center' },
  dateText: { fontSize: 12, color: '#6B7280', marginLeft: 4, fontWeight: '600' },
  
  // 💥 FIX: Added refIdLabel
  refIdLabel: { fontSize: 11, fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase' },

  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  prodImg: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#F3F4F6' },
  serviceName: { fontSize: 16, fontWeight: '800', color: '#111827' },
  clinicName: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  petInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyText: { fontSize: 14, fontWeight: '700', color: '#4B5563' },
  priceText: { fontSize: 14, fontWeight: '800', color: Colors.primary },
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
  modalCancelBtn: { marginTop: 12, backgroundColor: '#FEF2F2', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#FEE2E2' },
  modalCancelBtnPressed: { backgroundColor: '#FECACA', borderColor: '#FCA5A5', transform: [{ scale: 0.98 }] },
  modalCancelText: { color: '#EF4444', fontWeight: '800', fontSize: 16 },
  feedbackBox: { backgroundColor: '#FEF2F2', padding: 16, borderRadius: 12, marginTop: 4, borderWidth: 1, borderColor: '#FEE2E2' },
  feedbackLabel: { fontSize: 12, fontWeight: '800', color: '#991B1B', marginBottom: 6, textTransform: 'uppercase' },
  feedbackText: { fontSize: 14, color: '#7F1D1D', fontStyle: 'italic', lineHeight: 20 }
});