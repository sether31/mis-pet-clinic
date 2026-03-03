import React, { useState } from 'react';
import { View, StyleSheet, Pressable, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import AppText from '../../../components/AppText'; 
import { Colors } from '../../../constants/Color';

import AppointmentsList from './_components/AppointmentList';
import OrdersList from './_components/OrderList';

export default function ActivityScreen() {
  const [mainTab, setMainTab] = useState('appointments');
  const [activeTab, setActiveTab] = useState('upcoming'); 

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      
      {/* HEADER  */}
      <View style={styles.header}>
        <AppText style={styles.headerTitle}>My Activity</AppText>
        
        <View style={styles.masterTabBar}>
          <TouchableOpacity 
            style={[styles.masterTab, mainTab === 'appointments' && styles.masterTabActive]}
            onPress={() => setMainTab('appointments')}
          >
            <Ionicons name="paw" size={16} color={mainTab === 'appointments' ? Colors.primary : '#9CA3AF'} style={{marginRight: 6}} />
            <AppText style={[styles.masterTabText, mainTab === 'appointments' && styles.masterTabTextActive]}>Vet Visits</AppText>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.masterTab, mainTab === 'orders' && styles.masterTabActive]}
            onPress={() => setMainTab('orders')}
          >
            <Ionicons name="bag-handle" size={16} color={mainTab === 'orders' ? Colors.primary : '#9CA3AF'} style={{marginRight: 6}} />
            <AppText style={[styles.masterTabText, mainTab === 'orders' && styles.masterTabTextActive]}>Product Orders</AppText>
          </TouchableOpacity>
        </View>
      </View>

      {/* SUB TABS */}
      <View style={styles.tabBar}>
        <Pressable style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]} onPress={() => setActiveTab('upcoming')}>
          <View style={styles.tabContent}>
            <Ionicons name="calendar-outline" size={16} color={activeTab === 'upcoming' ? Colors.primary : '#6B7280'} />
            <AppText style={[styles.tabLabel, activeTab === 'upcoming' && styles.activeTabLabel]}>Upcoming</AppText>
          </View>
        </Pressable>
        
        <Pressable style={[styles.tab, activeTab === 'history' && styles.activeTab]} onPress={() => setActiveTab('history')}>
          <View style={styles.tabContent}>
            <Ionicons name="time-outline" size={16} color={activeTab === 'history' ? Colors.primary : '#6B7280'} />
            <AppText style={[styles.tabLabel, activeTab === 'history' && styles.activeTabLabel]}>History</AppText>
          </View>
        </Pressable>
      </View>

      {/* MAIN CONTENT */}
      {mainTab === 'appointments' ? (
        <AppointmentsList activeTab={activeTab} />
      ) : (
        <OrdersList activeTab={activeTab} />
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  
  // Header main Tabs
  header: { padding: 20, paddingTop: 10, backgroundColor: '#FFF' },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#111827', marginBottom: 16, marginTop: 10, },
  masterTabBar: { flexDirection: 'row', gap: 20 },
  masterTab: { flexDirection: 'row', alignItems: 'center', paddingBottom: 10, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  masterTabActive: { borderBottomColor: Colors.primary },
  masterTabText: { fontSize: 16, fontWeight: '700', color: '#9CA3AF' },
  masterTabTextActive: { color: Colors.primary },

  // Sub Tabs
  tabBar: { flexDirection: 'row', marginHorizontal: 20, marginTop: 15, backgroundColor: '#E5E7EB', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: '#FFF', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
  tabContent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tabLabel: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  activeTabLabel: { color: Colors.primary, fontWeight: '800' },
});