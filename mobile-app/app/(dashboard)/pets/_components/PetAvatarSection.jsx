import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from '../../../../components/AppText';
import AnimatedWrapper from '../../../../components/AnimatedWrapper';
import { Colors } from '../../../../constants/Color';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const PLACEHOLDER_IMAGE = require('../../../../assets/images/no-image.jpg');

export default function PetAvatarSection({ pet, newImage, isEditing, activeTab, onTabChange, onPickImage }) {
  const getDisplayImage = () => {
    if (newImage) return { uri: newImage }; 
    if (pet?.pet_picture && pet.pet_picture.trim() !== "") {
      const cleanPath = pet.pet_picture.startsWith('/') ? pet.pet_picture.substring(1) : pet.pet_picture;
      return { uri: `${API_URL}/${cleanPath}` };
    }
    return PLACEHOLDER_IMAGE;
  };

  return (
    <AnimatedWrapper index={0} style={styles.imageSection}>
      <TouchableOpacity onPress={onPickImage} disabled={!isEditing} activeOpacity={0.8}>
        <View style={styles.imageWrapper}>
          <Image source={getDisplayImage()} style={styles.petImage} resizeMode="cover" />
          {isEditing && (
            <View style={styles.editBadge}>
              <Ionicons name="camera" size={16} color="#FFF" />
            </View>
          )}
        </View>
      </TouchableOpacity>
      
      {!isEditing && (
        <>
          <AppText style={styles.petMainName}>{pet?.name}</AppText>
          <AppText style={styles.petSubText}>{pet?.breed} • {pet?.species}</AppText>
          
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tabBtn, activeTab === 'profile' && styles.tabBtnActive]} 
              onPress={() => onTabChange('profile')}
            >
              <AppText style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>Profile</AppText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabBtn, activeTab === 'records' && styles.tabBtnActive]} 
              onPress={() => onTabChange('records')}
            >
              <AppText style={[styles.tabText, activeTab === 'records' && styles.tabTextActive]}>Medical Records</AppText>
            </TouchableOpacity>
          </View>
        </>
      )}
    </AnimatedWrapper>
  );
}

const styles = StyleSheet.create({
  imageSection: { alignItems: 'center', paddingTop: 30, paddingBottom: 15, backgroundColor: Colors.white },
  imageWrapper: { 
    width: 120, height: 120, borderRadius: 60, backgroundColor: Colors.bg50, 
    elevation: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, 
    borderWidth: 4, borderColor: Colors.white, overflow: 'hidden', 
    marginBottom: 16, position: 'relative' 
  },
  petImage: { width: '100%', height: '100%' },
  editBadge: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 6, alignItems: 'center' },
  petMainName: { fontSize: 24, fontWeight: '900', color: '#111827', textTransform: 'capitalize' },
  petSubText: { fontSize: 15, color: '#6B7280', marginTop: 4, fontWeight: '500', textTransform: 'capitalize' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 10, padding: 4, marginTop: 24, width: '85%' },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabBtnActive: { backgroundColor: Colors.white },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#111827', fontWeight: '700' },
});