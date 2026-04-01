import React, { useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Pressable, Image, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Hooks & Utils
import { useUser } from '../../../hooks/useUser';
import AppText from '../../../components/AppText';
import AnimatedWrapper from '../../../components/AnimatedWrapper';
import { authFetch } from '../../../utils/auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const DEFAULT_IMAGE = require('../../../assets/images/no-image.jpg'); 

export default function HomeTab() {
  const router = useRouter();
  const { user } = useUser();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pickups, setPickups] = useState([]); 

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  const fetchDashboardData = async () => {
    try {
      const [notifRes, pickupRes] = await Promise.all([
        authFetch(`${API_URL}/api/pet-owner/home/get-latest-notif.php`),
        authFetch(`${API_URL}/api/pet-owner/home/get-latest-pickups.php`) 
      ]);

      if (notifRes?.success) {
        setMessages(notifRes.data || []);
        setUnreadCount(notifRes.unread_count || 0);
      }
      
      if (pickupRes?.success) {
        setPickups(pickupRes.data || []);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData().then(() => setRefreshing(false));
  }, []);

  const getMediaUrl = (path) => {
    if (!path || path.trim() === '') return null;
    if (path.startsWith('http')) return path; 
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${API_URL}/${cleanPath}`;
  };

  const userImage = getMediaUrl(user?.profile_picture) ? { uri: getMediaUrl(user?.profile_picture) } : DEFAULT_IMAGE;

  const renderBadgeCount = (count) => {
    if (count > 99) return "99+";
    return count;
  };

  const getCategoryIcon = (category) => {
    switch(category?.toLowerCase()) {
      case 'appointment': return "calendar";
      case 'system': return "information";
      case 'medical': return "medkit";
      case 'billing': return "card";
      default: return "notifications";
    }
  };

  const getStatusStyle = (status) => {
    switch(status?.toLowerCase()) {
      case 'confirmed': 
      case 'ready for pickup':
        return { bg: '#DBEAFE', text: '#1E40AF', label: 'Ready for pickup' };
      case 'pending':
      default: 
        return { bg: '#FEF3C7', text: '#92400E', label: 'Waiting for confirmation' };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* Dashboard Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable 
            onPress={() => router.push('/profile')}
            style={({ pressed }) => pressed && styles.pressedProf}
          >
            <Image source={userImage} style={styles.avatar} />
          </Pressable>
          <View>
            <AppText style={styles.greetingText}>Hello,</AppText>
            <AppText style={styles.nameText}>{user?.fname || 'Pet Parent'}</AppText>
          </View>
        </View>

        <Pressable 
          style={({ pressed }) => [styles.bellBtn, pressed && styles.bellBtnPressed]} 
          onPress={() => router.push('/home/Inbox')}
        >
          <Ionicons name="notifications-outline" size={24} color="#1F1F1F" />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <AppText style={styles.badgeText}>{renderBadgeCount(unreadCount)}</AppText>
            </View>
          )}
        </Pressable>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#42756C" />}
      >
        
        {/* QUICK ACTIONS ROW */}
        <AnimatedWrapper index={0} style={styles.quickActionsContainer}>
          <Pressable 
            style={({ pressed }) => [styles.actionBox, pressed && styles.actionBoxPressed]} 
            onPress={() => router.push('/pets')}
          >
            <View style={[styles.actionIconBg, { backgroundColor: '#42756C15' }]}>
              <Ionicons name="paw" size={24} color="#42756C" />
            </View>
            <AppText style={styles.actionText}>My Pets</AppText>
          </Pressable>

          <Pressable 
            style={({ pressed }) => [styles.actionBox, pressed && styles.actionBoxPressed]} 
            onPress={() => router.push('/clinics')}
          >
            <View style={[styles.actionIconBg, { backgroundColor: '#F59E0B15' }]}>
              <Ionicons name="calendar" size={24} color="#F59E0B" />
            </View>
            <AppText style={styles.actionText}>Book</AppText>
          </Pressable>

          <Pressable 
            style={({ pressed }) => [styles.actionBox, pressed && styles.actionBoxPressed]} 
            onPress={() => router.push('/activity?tab=orders')}
          >
            <View style={[styles.actionIconBg, { backgroundColor: '#3B82F615' }]}>
              <Ionicons name="receipt-outline" size={24} color="#3B82F6" />
            </View>
            <AppText style={styles.actionText}>Activity</AppText>
          </Pressable>
        </AnimatedWrapper>

        {loading ? (
          <ActivityIndicator size="large" color="#42756C" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* NOTIFICATION PREVIEW */}
            <AnimatedWrapper index={1}>
              <View style={styles.sectionHeader}>
                <AppText style={styles.sectionTitle}>Recent Messages</AppText>
                <Pressable 
                  onPress={() => router.push('/home/Inbox')}
                  style={({ pressed }) => pressed && styles.pressedOpacity}
                >
                  <AppText style={styles.seeAllText}>See All</AppText>
                </Pressable>
              </View>

              <View style={styles.card}>
                {messages.length > 0 ? (
                  messages.map((msg, index) => (
                    <Pressable 
                      key={msg.id} 
                      style={({ pressed }) => [
                        styles.messageRow, 
                        index === messages.length - 1 && { borderBottomWidth: 0, paddingBottom: 0, marginBottom: 0 },
                        pressed && styles.cardPressed
                      ]}
                      onPress={() => router.push({
                        pathname: '/home/Inbox',
                        params: { msgId: msg.id }
                      })}
                    >
                      <View style={[styles.messageIcon, msg.is_read === 0 && { backgroundColor: '#42756C15' }]}>
                        <Ionicons name={getCategoryIcon(msg.category)} size={20} color={msg.is_read === 0 ? "#42756C" : "#9CA3AF"} />
                      </View>
                      <View style={styles.messageContent}>
                        <View style={styles.messageHeaderRow}>
                          <AppText style={[styles.messageSender, msg.is_read === 0 && { color: '#1F1F1F', fontWeight: '800' }]} numberOfLines={1}>
                            {msg.sender}
                          </AppText>
                          <AppText style={styles.messageTime}>{msg.time}</AppText>
                        </View>
                        <AppText style={[styles.messagePreview, msg.is_read === 0 && { color: '#4B5563', fontWeight: '600' }]} numberOfLines={1}>
                          {msg.text}
                        </AppText>
                      </View>
                      {msg.is_read === 0 && <View style={styles.unreadDot} />}
                    </Pressable>
                  ))
                ) : (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="notifications-outline" size={40} color="#D1D5DB" />
                    <AppText style={styles.emptyText}>No new notifications yet.</AppText>
                  </View>
                )}
              </View>
            </AnimatedWrapper>

            {/* PENDING PICKUPS */}
            <AnimatedWrapper index={2}>
              <View style={styles.sectionHeader}>
                <AppText style={styles.sectionTitle}>Upcoming Orders</AppText>
                <Pressable 
                  onPress={() => router.push('/activity?tab=orders')}
                  style={({ pressed }) => pressed && styles.pressedOpacity}
                >
                  <AppText style={styles.seeAllText}>See All</AppText>
                </Pressable>
              </View>

              <View style={styles.card}>
                {pickups.length > 0 ? (
                  pickups.map((item, index) => {
                    const statusStyle = getStatusStyle(item.order_status);
                    const dateObj = new Date(item.pickup_date);

                    return (
                      <Pressable 
                        key={item.order_id} 
                        style={({ pressed }) => [
                          styles.reminderRow, 
                          index === pickups.length - 1 && { borderBottomWidth: 0, paddingBottom: 0, marginBottom: 0 },
                          pressed && styles.cardPressed
                        ]}
                        onPress={() => router.push('/activity?tab=orders')} 
                      >
                        <View style={{ flex: 1 }}>
                          <View style={styles.cardHeader}>
                            <View style={styles.dateTime}>
                              <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                              <AppText style={styles.dateText}>
                                {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </AppText>
                            </View>
                            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                              <AppText style={[styles.statusText, { color: statusStyle.text }]}>{statusStyle.label}</AppText>
                            </View>
                          </View>

                          <View style={styles.productRow}>
                            <Image 
                              source={item.prod_pic ? { uri: `${API_URL}/${item.prod_pic}` } : DEFAULT_IMAGE} 
                              style={styles.prodImg} 
                            />
                            <View style={{flex: 1}}>
                              <AppText style={styles.serviceName} numberOfLines={1}>{item.product_name}</AppText>
                              <AppText style={styles.clinicName}>{item.branch_name}</AppText>
                            </View>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })
                ) : (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="cube-outline" size={40} color="#D1D5DB" />
                    <AppText style={styles.emptyText}>No upcoming orders.</AppText>
                  </View>
                )}
              </View>
            </AnimatedWrapper>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  
  pressedProf: { transform: [{ scale: 0.95 }] },
  bellBtnPressed: { backgroundColor: '#E5E7EB', transform: [{ scale: 0.95 }] },
  actionBoxPressed: { opacity: 0.8, transform: [{ scale: 0.96 }] },
  cardPressed: { backgroundColor: '#F9FAFB', opacity: 0.9, borderRadius: 12 }, 
  
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingHorizontal: 20, paddingTop: 15, paddingBottom: 15, 
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#D1D5DB' 
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E5E7EB', marginRight: 12, borderWidth: 1, borderColor: '#D1D5DB' },
  greetingText: { fontSize: 13, color: '#6B7280', fontWeight: '600', marginBottom: 2 },
  nameText: { fontSize: 18, fontWeight: '800', color: '#1F1F1F' },
  bellBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  badge: { 
    position: 'absolute', top: -4, right: -4, backgroundColor: '#EF4444', 
    minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFFFFF', paddingHorizontal: 4
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  quickActionsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  actionBox: { alignItems: 'center', flex: 1 },
  actionIconBg: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionText: { fontSize: 13, fontWeight: '700', color: '#4B5563' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1F1F1F' },
  seeAllText: { fontSize: 14, fontWeight: '700', color: '#42756C' },
  card: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20, marginBottom: 25, borderWidth: 1, borderColor: '#D1D5DB' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  emptyText: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', fontStyle: 'italic', marginTop: 8 },
  messageRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 15, marginBottom: 15, marginHorizontal: -10, paddingHorizontal: 10, paddingTop: 10 }, 
  messageIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  messageContent: { flex: 1, paddingRight: 10 },
  messageHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  messageSender: { flex: 1, fontSize: 15, fontWeight: '600', color: '#4B5563', paddingRight: 10 },
  messageTime: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  messagePreview: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#42756C', marginLeft: 5 },
  reminderRow: { flexDirection: 'column', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 15, marginBottom: 15, marginHorizontal: -10, paddingHorizontal: 10, paddingTop: 10 }, 
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }, 
  dateTime: { flexDirection: 'row', alignItems: 'center' },
  dateText: { fontSize: 12, color: '#6B7280', marginLeft: 4, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  prodImg: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#F3F4F6' },
  serviceName: { fontSize: 16, fontWeight: '800', color: '#111827' },
  clinicName: { fontSize: 13, color: '#6B7280', marginTop: 2 },
});