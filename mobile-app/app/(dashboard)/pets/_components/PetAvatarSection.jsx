import React from 'react';
import { View, TouchableOpacity, Pressable, Image, StyleSheet } from 'react-native';
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
          <AppText style={styles.petMainId}>#{pet?.pet_id}</AppText>
          <AppText style={styles.petMainName}>{pet?.name}</AppText>
          <AppText style={styles.petSubText}>
            {pet?.species} • {pet?.breed && pet.breed.trim() !== "" ? pet.breed : 'N/A'}
          </AppText>
                
          <View style={styles.tabContainer}>
            <Pressable 
              style={[styles.tabBtn, activeTab === 'profile' && styles.tabBtnActive]} 
              onPress={() => onTabChange('profile')}
            >
              <View style={styles.tabRow}>
                <Ionicons 
                  name={activeTab === 'profile' ? "paw" : "paw-outline"} 
                  size={16} 
                  color={activeTab === 'profile' ? Colors.primary : '#9CA3AF'} 
                />
                <AppText style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>
                  Profile
                </AppText>
              </View>
            </Pressable>
            
            <Pressable 
              style={[styles.tabBtn, activeTab === 'records' && styles.tabBtnActive]} 
              onPress={() => onTabChange('records')}
            >
              <View style={styles.tabRow}>
                <Ionicons 
                  name={activeTab === 'records' ? "document-text" : "document-text-outline"} 
                  size={16} 
                  color={activeTab === 'records' ? Colors.primary : '#9CA3AF'} 
                />
                <AppText style={[styles.tabText, activeTab === 'records' && styles.tabTextActive]}>
                  Records
                </AppText>
              </View>
            </Pressable>
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
    borderWidth: 4, borderColor: Colors.primary, overflow: 'hidden', 
    marginBottom: 16, position: 'relative' 
  },
  petImage: { width: '100%', height: '100%' },
  editBadge: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 6, alignItems: 'center' },
  petMainId: { fontSize: 15, color: '#6B7280', fontWeight: '500', marginBottom: 2 },
  petMainName: { fontSize: 24, fontWeight: '900', color: '#111827', textTransform: 'capitalize' },
  petSubText: { fontSize: 15, color: '#6B7280', marginTop: 4, fontWeight: '500', textTransform: 'capitalize' },
  
  tabContainer: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 10, padding: 4, width: '90%', marginTop: 24 },
  tabBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tabBtnActive: { backgroundColor: Colors.white },
  
  tabRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: Colors.primary, fontWeight: '800' },
});