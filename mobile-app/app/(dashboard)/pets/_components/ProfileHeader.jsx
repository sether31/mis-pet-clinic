import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from '../../../../components/AppText';
import { Colors } from '../../../../constants/Color';

export default function ProfileHeader({ isEditing, petName, activeTab, onToggleEdit, onBack }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backBtn} onPress={isEditing ? onToggleEdit : onBack}>
        <Ionicons name={isEditing ? "close" : "arrow-back"} size={26} color="#111827" />
      </TouchableOpacity>
      
      <AppText style={styles.headerTitle}>{isEditing ? 'Edit Profile' : petName}</AppText>
      
      {activeTab === 'profile' ? (
        <TouchableOpacity onPress={onToggleEdit} style={{ padding: 8 }}>
          <AppText style={{ color: isEditing ? '#6B7280' : Colors.primary, fontWeight: '700' }}>
            {isEditing ? 'Cancel' : 'Edit'}
          </AppText>
        </TouchableOpacity>
      ) : (
        <View style={{ width: 40 }} /> 
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 15, 
    backgroundColor: Colors.white, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F3F4F6' 
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827', textTransform: 'capitalize' },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
});