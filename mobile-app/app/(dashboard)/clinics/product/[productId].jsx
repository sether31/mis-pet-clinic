import { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, Image, ScrollView, ActivityIndicator, TextInput, Modal, Pressable } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import AppText from '../../../../components/AppText';
import { Colors } from '../../../../constants/Color';
import { authFetch } from '../../../../utils/auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const NO_IMAGE = require('../../../../assets/images/no-image.jpg');
const DEFAULT_CLINIC_LOGO = require('../../../../assets/images/no-image.jpg'); 

export default function ProductDetailScreen() {
  const router = useRouter();
  const { productId, branch_id, from } = useLocalSearchParams(); 

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [quantity, setQuantity] = useState('1');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  
  const [dateError, setDateError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (productId && branch_id) {
        setLoading(true);
        fetchProductDetails();
      }
    }, [productId, branch_id])
  );

  const fetchProductDetails = async () => {
    try {
      setProduct(null);
      
      const res = await authFetch(`${API_URL}/api/pet-owner/shop/get-product-details.php?product_id=${productId}&branch_id=${branch_id}`);
      if (res?.success) {
        setProduct(res.data);
      } else {
        if (res?.is_unavailable) {
          Toast.show({ 
            type: 'error', 
            text1: 'Shop Unavailable', 
            text2: 'This clinic is currently under maintenance or unavailable',
            visibilityTime: 4000
          });
        } else {
          Toast.show({ type: 'error', text1: 'Something went wrong' });
        }
        router.back();
      }
    } catch (error) {
      console.error(error);
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const getMediaUrl = (path) => {
    if (!path || path.trim() === '') return null;
    if (path.startsWith('http')) return path; 
    return `${API_URL}/${path.startsWith('/') ? path.substring(1) : path}`;
  };

  const handleQuantityChange = (text) => {
    const cleanText = text.replace(/[^0-9]/g, '');
    if (cleanText === '') {
      setQuantity('');
      return;
    }
    let num = parseInt(cleanText, 10);
    const maxStock = parseInt(product.total_stock);
    if (num > maxStock) {
      num = maxStock;
      Toast.show({ type: 'info', text1: 'Maximum stock reached' });
    }
    setQuantity(num.toString());
  };

  const handleQuantityBlur = () => {
    if (quantity === '' || parseInt(quantity) < 1) {
      setQuantity('1');
    }
  };

  const increaseQuantity = () => {
    const current = parseInt(quantity) || 1;
    if (current < parseInt(product.total_stock)) {
      setQuantity((current + 1).toString());
    } else {
      Toast.show({ type: 'info', text1: 'Maximum stock reached' });
    }
  };

  const decreaseQuantity = () => {
    const current = parseInt(quantity) || 1;
    if (current > 1) {
      setQuantity((current - 1).toString());
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hour, minute] = timeString.split(':');
    const h = parseInt(hour, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedHour = h % 12 || 12;
    return `${formattedHour}:${minute} ${ampm}`;
  };

  const handleConfirmReservation = async () => {
    if (!selectedDate) {
      setDateError('Please select a pickup date.');
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);
    setDateError('');

    try {
      const payload = {
        product_id: productId,
        branch_id: branch_id,
        quantity: quantity,
        pickup_date: selectedDate
      };

      const res = await authFetch(`${API_URL}/api/pet-owner/shop/create-reservation.php`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res?.success) {
        setIsModalVisible(false);
        setQuantity('1');
        setSelectedDate(null);
        setDateError('');
        
        fetchProductDetails(); 

        Toast.show({
          type: 'success',
          text1: 'Reservation Confirmed!',
          text2: 'Your items have been reserved successfully.',
          position: 'top'
        });
        
        if (from === 'activity') {
          router.navigate('/(dashboard)/activity');
        } else {
          router.replace('/activity');
        }
      } else {
        if(res?.is_unavailable) {
          setIsModalVisible(false);
          Toast.show({ 
            type: 'error', 
            text1: 'Clinic Unavailable', 
            text2: res.message,
            visibilityTime: 5000 
          });
          router.back(); 
          return;
        }

        setDateError(res.message || 'Something went wrong');
      }
    } catch (error) {
      setDateError('Something went wrong');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const pickupDates = useMemo(() => {
    if (!product || !product.schedule || product.schedule.length === 0) return [];
    
    const availableDates = [];
    let dayOffset = 0; 

    while (availableDates.length < 3) {
      const date = new Date();
      date.setDate(date.getDate() + dayOffset);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }); 

      const dayConfig = product.schedule.find(
        d => d.day_of_week.toLowerCase() === dayName.toLowerCase()
      );

      const isClosed = dayConfig ? (dayConfig.is_closed == 1 || dayConfig.is_closed === "1" || dayConfig.is_closed === true) : true;

      if (dayConfig && !isClosed) {
        let label = "";
        if (dayOffset === 0) label = "Today";
        else if (dayOffset === 1) label = "Tomorrow";
        else label = date.toLocaleDateString('en-US', { weekday: 'short' });

        const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        availableDates.push({ 
          id: date.toISOString().split('T')[0], 
          label: `${label}, ${formattedDate}`,
          startTime: formatTime(dayConfig.start_time),
          endTime: formatTime(dayConfig.end_time)
        });
      }

      dayOffset++;
      if (dayOffset > 30) break; 
    }

    if (availableDates.length > 0 && !selectedDate) {
      setSelectedDate(availableDates[0].id);
    }

    return availableDates;
  }, [product]);

  const selectedDayInfo = pickupDates.find(d => d.id === selectedDate);

  if (loading || !product) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  const imageSource = getMediaUrl(product.prod_pic) ? { uri: getMediaUrl(product.prod_pic) } : NO_IMAGE;
  // Fallback to default if clinic_logo isn't provided by the API yet
  const clinicLogoSource = getMediaUrl(product.branch_image) ? { uri: getMediaUrl(product.branch_image) } : DEFAULT_CLINIC_LOGO;
  
  const isOutOfStock = parseInt(product.total_stock) <= 0;
  const safeQty = parseInt(quantity) || 1;
  const totalPrice = (parseFloat(product.price) * safeQty).toFixed(2);

  const handleSmartBack = () => {
    if(from === 'activity') {
      router.navigate('/(dashboard)/activity'); 
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      
      <View style={styles.header}>
        <Pressable 
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]} 
          onPress={handleSmartBack}
        >
          <Ionicons name="arrow-back" size={26} color="#111827" />
        </Pressable>
        <AppText style={styles.headerTitle}>Product Details</AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={styles.imageWrapper}>
          <Image source={imageSource} style={styles.productImage} />
        </View>

        <View style={styles.detailsContainer}>
          <AppText style={styles.category}>{product.category}</AppText>
          <AppText style={styles.title}>{product.name}</AppText>
          <AppText style={styles.price}>₱{parseFloat(product.price).toFixed(2)}</AppText>

          <View style={styles.stockBadge}>
            <Ionicons name={isOutOfStock ? "close-circle" : "checkmark-circle"} size={18} color={isOutOfStock ? '#EF4444' : Colors.primary} />
            <AppText style={[styles.stockText, isOutOfStock && { color: '#EF4444' }]}>
              {isOutOfStock ? 'Sold Out' : `${product.total_stock} items left in stock`}
            </AppText>
          </View>

          <View style={styles.divider} />

          {/* SELLER PROFILE SECTION */}
          <Pressable 
            style={({ pressed }) => [
              styles.sellerContainer, 
              pressed && styles.sellerContainerPressed
            ]}
            onPress={() => router.push(`/(dashboard)/clinics/${branch_id}`)}
          >
            {({ pressed }) => (
              <>
                <Image source={clinicLogoSource} style={styles.sellerLogo} />
                <View style={styles.sellerInfo}>
                  <AppText style={styles.sellerName}>{product.branch_name}</AppText>
                  <AppText style={styles.sellerSubtitle}>View Clinic Profile</AppText>
                </View>
                <Ionicons 
                  name="chevron-forward" 
                  size={20} 
                  color={pressed ? "#9CA3AF" : Colors.primary} 
                />
              </>
            )}
          </Pressable>

          <View style={styles.divider} />

          <AppText style={styles.sectionTitle}>Description</AppText>
          <AppText style={styles.description}>
            {product.description || "No description provided for this item."}
          </AppText>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        {!isOutOfStock ? (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', marginBottom: 12 }}>
              <AppText style={styles.totalPriceLabel}>Total: <AppText style={styles.totalPriceValue}>₱{totalPrice}</AppText></AppText>
              <AppText style={styles.maxStockHint}>Max: {product.total_stock}</AppText>
            </View>

            <View style={styles.actionRow}>
              <View style={styles.quantityContainer}>
                <Pressable 
                  style={({ pressed }) => [styles.qtyBtn, pressed && styles.qtyBtnPressed]} 
                  onPress={decreaseQuantity}
                >
                  <Ionicons name="remove" size={20} color="#111827" />
                </Pressable>
                
                <TextInput 
                  style={styles.qtyInput}
                  keyboardType="numeric"
                  value={quantity}
                  onChangeText={handleQuantityChange}
                  onBlur={handleQuantityBlur}
                  maxLength={3} 
                />
                
                <Pressable 
                  style={({ pressed }) => [styles.qtyBtn, pressed && styles.qtyBtnPressed]} 
                  onPress={increaseQuantity}
                >
                  <Ionicons name="add" size={20} color="#111827" />
                </Pressable>
              </View>

              <Pressable 
                style={({ pressed }) => [
                  styles.reserveBtn,
                  pressed && styles.solidBtnPressed
                ]}
                onPress={() => {
                  setDateError(''); 
                  setIsModalVisible(true);
                }}
              >
                <AppText style={styles.reserveBtnText}>Schedule Pickup</AppText>
              </Pressable>
            </View>
          </>
        ) : (
          <View style={[styles.reserveBtn, styles.reserveBtnDisabled, { width: '100%' }]}>
            <AppText style={styles.reserveBtnText}>Currently Unavailable</AppText>
          </View>
        )}
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
        statusBarTranslucent={true} 
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackgroundClick} onPress={() => setIsModalVisible(false)} />
          
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <AppText style={styles.modalTitle}>Pickup Schedule</AppText>
                <AppText style={styles.modalSub}>Reservations are held for a maximum of 3 days.</AppText>
              </View>
              <Pressable onPress={() => setIsModalVisible(false)}>
                {({ pressed }) => (
                  <Ionicons name="close-circle" size={28} color={pressed ? "#EF4444" : "#D1D5DB"} />
                )}
              </Pressable>
            </View>

            <AppText style={styles.pickerLabel}>Select Date</AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerScroll}>
              {pickupDates.map(date => (
                <Pressable 
                  key={date.id} 
                  style={({ pressed }) => [
                    styles.pickerBtn, 
                    selectedDate === date.id && styles.pickerBtnActive,
                    pressed && styles.pickerBtnPressed
                  ]}
                  onPress={() => {
                    setSelectedDate(date.id);
                    setDateError(''); 
                  }}
                >
                  <AppText style={[styles.pickerBtnText, selectedDate === date.id && styles.pickerBtnTextActive]}>
                    {date.label}
                  </AppText>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.infoBox}>
              <Ionicons name="time-outline" size={24} color="#1D4ED8" style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <AppText style={styles.infoBoxTitle}>{product.branch_name} Pickup Info</AppText>
                
                {selectedDayInfo ? (
                  <View>
                    <AppText style={styles.infoBoxText}>
                      You can claim your reserved items anytime between {selectedDayInfo.startTime} - {selectedDayInfo.endTime} on your selected date.
                    </AppText>
                    
                    <View style={styles.cashNotice}>
                      <Ionicons name="pricetag-outline" size={16} color="#1E3A8A" />
                      <AppText style={styles.cashNoticeText}>
                        Payment is strictly Cash Only at the clinic.
                      </AppText>
                    </View>
                  </View>
                ) : (
                  <AppText style={styles.infoBoxText}>Please select a valid date to see pickup hours.</AppText>
                )}
                
              </View>
            </View>

            {dateError ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <AppText style={styles.errorText}>{dateError}</AppText>
              </View>
            ) : null}

            <Pressable 
              style={({ pressed }) => [
                styles.confirmBtn,
                pressed && styles.solidBtnPressed
              ]} 
              onPress={handleConfirmReservation}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <AppText style={styles.confirmBtnText}>Confirm Reservation</AppText>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 15, 
    backgroundColor: Colors.white, 
    zIndex: 10, 
    borderBottomWidth: 1, 
    borderBottomColor: '#E5E7EB' 
  },
  headerTitle: { 
    flex: 1, 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#111827', 
    textAlign: 'center', 
    marginHorizontal: 12 
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backBtnPressed: { opacity: 0.5 },

  imageWrapper: { width: '100%', height: 350, backgroundColor: '#F3F4F6' },
  productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  detailsContainer: { padding: 24 },
  category: { fontSize: 13, fontWeight: '800', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '900', color: '#111827', lineHeight: 34, marginBottom: 12 },
  price: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 20 },
  stockBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', alignSelf: 'flex-start' },
  stockText: { fontSize: 14, fontWeight: '700', color: '#374151', marginLeft: 8 },
  
  sellerContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 12 },
  sellerContainerPressed: { backgroundColor: '#F3F4F6' },
  sellerLogo: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E5E7EB', borderWidth: 1, borderColor: '#D1D5DB' },
  sellerInfo: { flex: 1, marginLeft: 12 },
  sellerName: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 2 },
  sellerSubtitle: { fontSize: 13, color: Colors.primary, fontWeight: '600' },

  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 12 },
  description: { fontSize: 15, color: '#4B5563', lineHeight: 24 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', padding: 20, paddingBottom: 30, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  totalPriceLabel: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  totalPriceValue: { fontSize: 18, color: '#111827', fontWeight: '900' },
  maxStockHint: { fontSize: 12, color: Colors.primary, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 16 },
  quantityContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  qtyBtn: { width: 44, height: 48, justifyContent: 'center', alignItems: 'center' },
  qtyBtnPressed: { backgroundColor: '#E5E7EB', borderRadius: 10 },
  qtyInput: { width: 40, height: 48, textAlign: 'center', fontSize: 18, fontWeight: '800', color: '#111827' },
  reserveBtn: { flex: 1, backgroundColor: '#111827', height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  solidBtnPressed: { backgroundColor: Colors.primary, transform: [{ scale: 0.98 }] },
  reserveBtnDisabled: { backgroundColor: '#9CA3AF' },
  reserveBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackgroundClick: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#111827' },
  modalSub: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  pickerLabel: { fontSize: 14, fontWeight: '800', color: '#111827', textTransform: 'uppercase', marginBottom: 10, marginTop: 10 },
  pickerScroll: { gap: 10, paddingBottom: 10 },
  pickerBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  pickerBtnActive: { backgroundColor: Colors.primary + '15', borderColor: Colors.primary },
  pickerBtnPressed: { backgroundColor: '#E5E7EB', transform: [{ scale: 0.97 }] },
  pickerBtnText: { fontSize: 14, fontWeight: '600', color: '#4B5563' },
  pickerBtnTextActive: { color: Colors.primary, fontWeight: '800' },
  infoBox: { flexDirection: 'row', backgroundColor: '#DBEAFE', padding: 16, borderRadius: 12, marginTop: 20, marginBottom: 10, alignItems: 'flex-start', gap: 12 },
  infoBoxTitle: { fontSize: 14, color: '#1E3A8A', fontWeight: '800', marginBottom: 4 },
  infoBoxText: { fontSize: 13, color: '#1E3A8A', lineHeight: 20, fontWeight: '500' },
  cashNotice: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6, backgroundColor: '#BFDBFE', padding: 8, borderRadius: 8 },
  cashNoticeText: { fontSize: 12, color: '#1E3A8A', fontWeight: '800' },
  errorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', padding: 12, borderRadius: 8, marginBottom: 12, gap: 6 },
  errorText: { color: '#EF4444', fontSize: 13, fontWeight: '600', flex: 1, lineHeight: 18 },
  confirmBtn: { backgroundColor: '#111827', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  confirmBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' }
});