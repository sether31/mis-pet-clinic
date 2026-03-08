import React, { useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import AppText from '../../../components/AppText';
import AnimatedWrapper from '../../../components/AnimatedWrapper';
import AppButton from '../../../components/AppButton'; 
import { authFetch } from '../../../utils/auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function Inbox() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMsg, setSelectedMsg] = useState(null);

  useFocusEffect(
    useCallback(() => {
      fetchInbox();
    }, [])
  );

  const fetchInbox = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API_URL}/api/pet-owner/home/get-notif.php`);
      if (res?.success) {
        setMessages(res.data);
      }
    } catch (error) {
      console.error("Error fetching inbox:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle tapping a message
  const handlePressMessage = async (msg) => {
    setSelectedMsg(msg);
    setModalVisible(true);

    if (msg.is_read === 1) return;

    setMessages(prevMessages => 
      prevMessages.map(m => 
        m.id === msg.id ? { ...m, is_read: 1 } : m
      )
    );

    // 4. Tell the database quietly in the background
    try {
      await authFetch(`${API_URL}/api/pet-owner/home/read-notif.php`, {
        method: 'POST',
        body: JSON.stringify({ notification_id: msg.id })
      });
    } catch (error) {
      console.error("Failed to mark read:", error);
    }
  };

  // DYNAMIC ICON ASSIGNMENT
  const getCategoryIcon = (category) => {
    switch(category?.toLowerCase()) {
      case 'appointment':
        return "calendar";    
      case 'system':
        return "information";   
      case 'medical':
        return "medical";      
      case 'billing':
        return "card";          
      default:
        return "notifications"; 
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.simpleHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1F1F1F" />
        </TouchableOpacity>
        <AppText style={styles.headerTitle}>Inbox</AppText>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {loading ? (
          <ActivityIndicator size="large" color="#42756C" style={{ marginTop: 50 }} />
        ) : messages.length > 0 ? (
          messages.map((msg, index) => (
            <AnimatedWrapper index={index} key={msg.id}>
              
              <TouchableOpacity 
                activeOpacity={msg.is_read === 0 ? 0.7 : 1}
                onPress={() => handlePressMessage(msg)}
                style={[
                  styles.messageCard, 
                  msg.is_read === 0 && styles.unreadCard
                ]}
              >
                <View style={styles.iconContainer}>
                  <View style={[styles.iconBg, msg.is_read === 0 ? { backgroundColor: '#42756C' } : { backgroundColor: '#F3F4F6' }]}>
                    {/* 💥 IMPLEMENTED DYNAMIC ICON HERE */}
                    <Ionicons 
                      name={getCategoryIcon(msg.category)} 
                      size={20} 
                      color={msg.is_read === 0 ? "#FFFFFF" : "#9CA3AF"} 
                    />
                  </View>
                </View>

                <View style={styles.messageContent}>
                  <View style={styles.messageHeader}>
                    <AppText style={[styles.senderText, msg.is_read === 0 && styles.unreadText]} numberOfLines={1}>
                      {msg.sender}
                    </AppText>
                    <AppText style={styles.timeText}>{msg.time}</AppText>
                  </View>
                  
                  <AppText style={[styles.messageText, msg.is_read === 0 && { color: '#1F1F1F' }]} numberOfLines={2}>
                    {msg.text}
                  </AppText>
                </View>

                {msg.is_read === 0 && <View style={styles.unreadDot} />}
                
              </TouchableOpacity>
            </AnimatedWrapper>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="mail-open-outline" size={60} color="#D1D5DB" />
            <AppText style={styles.emptyStateTitle}>No notifications yet</AppText>
          </View>
        )}
      </ScrollView>

      {/* THE MESSAGE VIEWER MODAL */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalIconBg}>
                {/* DYNAMIC ICON HERE */}
                <Ionicons 
                  name={getCategoryIcon(selectedMsg?.category)} 
                  size={24} 
                  color="#42756C" 
                />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <AppText style={styles.modalSender}>{selectedMsg?.sender}</AppText>
                <AppText style={styles.modalTime}>{selectedMsg?.time}</AppText>
              </View>
            </View>

            {/* Modal Body (Full Text) */}
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <AppText style={styles.modalFullText}>
                {selectedMsg?.text}
              </AppText>
            </ScrollView>

            {/* Modal Footer / Button */}
            <View style={styles.modalFooter}>
              <AppButton title="Close" onPress={() => setModalVisible(false)} />
            </View>

          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  simpleHeader: { 
    height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#D1D5DB', position: 'relative' 
  },
  backButton: { position: 'absolute', left: 15, height: '100%', justifyContent: 'center', paddingRight: 20, zIndex: 10 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1F1F1F' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  
  messageCard: { 
    flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 16, 
    borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#D1D5DB',
  },
  unreadCard: { borderColor: '#42756C', backgroundColor: '#F8FAFC' },
  iconContainer: { marginRight: 15 },
  iconBg: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  messageContent: { flex: 1, justifyContent: 'center' },
  messageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  
  senderText: { flex: 1, fontSize: 16, fontWeight: '600', color: '#4B5563', paddingRight: 10 },
  unreadText: { fontWeight: '800', color: '#1F1F1F' },
  timeText: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  messageText: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#42756C', alignSelf: 'center', marginLeft: 10 },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyStateTitle: { fontSize: 20, fontWeight: '800', color: '#1F1F1F', marginTop: 15, marginBottom: 8 },
  emptyStateText: { fontSize: 14, color: '#6B7280', textAlign: 'center', paddingHorizontal: 30, lineHeight: 22 },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    borderRadius: 24,
    padding: 24,
    maxHeight: '80%', 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 16,
    marginBottom: 16,
  },
  modalIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#42756C15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSender: { fontSize: 18, fontWeight: '800', color: '#1F1F1F', marginBottom: 2 },
  modalTime: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  modalBody: {
    marginBottom: 20,
  },
  modalFullText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
  },
  modalFooter: {
    marginTop: 10,
  }
});