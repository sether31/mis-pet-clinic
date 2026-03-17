import React, { useState, useCallback } from 'react'; // 👈 Added useCallback
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'; // 👈 Added useFocusEffect
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker'; 
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Color';
import { authFetch } from '../../../utils/auth';

// Component Imports
import ProfileHeader from './_components/ProfileHeader';
import PetAvatarSection from './_components/PetAvatarSection';
import ProfileForm from './_components/ProfileForm';
import MedicalRecordsList from './_components/MedicalRecordsList';
import AppText from '../../../components/AppText';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function PetProfile() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false); 
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const [pet, setPet] = useState(null); 
  const [form, setForm] = useState({}); 
  const [newImage, setNewImage] = useState(null); 
  const [errors, setErrors] = useState({}); 
  const [medicalRecords, setMedicalRecords] = useState([]); 

  // 👇 FIX: Replaced useEffect with useFocusEffect so it ALWAYS fetches fresh data
  useFocusEffect(
    useCallback(() => {
      if (id) {
        setIsEditing(false); // Force editing mode off when entering screen
        fetchPetDetails();
        fetchMedicalRecords(); 
      }
    }, [id])
  );

  const fetchPetDetails = async () => {
    try {
      const data = await authFetch(`${API_URL}/api/pet-owner/pet/get-pet-details.php?id=${id}`);
      if (data?.success) {
        setPet(data.data);
        setForm(data.data); 
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: 'Could not load pet details' });
        router.back();
      }
    } catch (error) {
      console.error("Error fetching pet details:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMedicalRecords = async () => {
    try {
      const data = await authFetch(`${API_URL}/api/pet-owner/pet/get-medical-records.php?pet_id=${id}`);
      if (data?.success) {
        setMedicalRecords(data.data);
      }
    } catch (error) {
      console.error("Error fetching medical records:", error);
    }
  };

  const toggleEdit = () => {
    if (isEditing) {
      setForm(pet);
      setNewImage(null);
      setErrors({}); 
    }
    setIsEditing(!isEditing);
  };

  const validateField = (name, value) => {
    let error = null;
    const optionalFields = ['weight', 'medical_conditions', 'pet_picture']; 
    if (!value?.toString().trim() && !optionalFields.includes(name)) {
      if (name === 'name') error = "Pet name is required";
      else if (name === 'species') error = "Species is required";
      else if (name === 'breed') error = "Breed is required";
      else if (name === 'sex') error = "Sex is required";
      else if (name === 'birthdate') error = "Date of Birth is required";
    }
    setErrors(prev => ({ ...prev, [name]: error }));
    return error;
  };

  const updatePetStatus = async (action) => {
    setSaving(true);
    try {
      const res = await authFetch(`${API_URL}/api/pet-owner/pet/update-pet-status.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pet_id: id, action: action }) 
      });
      return res;
    } catch (err) {
      console.error(err);
      return { success: false };
    } finally {
      setSaving(false);
    }
  };

  const handleMarkDeceased = () => {
    Alert.alert(
      "Report Pet as Passed Away",
      `Are you sure? This will stop all future clinic reminders for ${pet?.name}.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Confirm", style: "destructive",
          onPress: async () => {
            const res = await updatePetStatus('deceased');
            if (res?.success) {
              setPet(prev => ({ ...prev, is_deceased: 1 }));
              setForm(prev => ({ ...prev, is_deceased: 1 }));
              setIsEditing(false);
              Toast.show({ type: 'info', text1: 'Status Updated', text2: 'We are truly sorry for your loss.' });
            }
          }
        }
      ]
    );
  };

  const handleRestoreLiving = () => {
    Alert.alert(
      "Restore Pet?",
      `This will set ${pet?.name}'s status back to living and re-enable clinic reminders.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Confirm", 
          onPress: async () => {
            const res = await updatePetStatus('restore');
            if (res?.success) {
              setPet(prev => ({ ...prev, is_deceased: 0 }));
              setForm(prev => ({ ...prev, is_deceased: 0 }));
              Toast.show({
                type: 'success',
                text1: 'Pet Restored Successfully!',
                text2: `${pet?.name} is back! Clinic reminders have been re-enabled.`
              });
            }
          }
        }
      ]
    );
  };

  const handleDeletePet = () => {
    Alert.alert(
      "Remove Pet?",
      `This will hide ${pet?.name} from your list. You can restore this pet later from your archives.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", style: "destructive",
          onPress: async () => {
            const res = await updatePetStatus('delete');
            if (res?.success) {
              Toast.show({
                type: 'success',
                text1: 'Pet Removed Successfully!',
                text2: 'The pet has been moved to your archives and hidden from this list.'
              });
              router.replace('/pets'); 
            }
          }
        }
      ]
    );
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('pet_id', id);
      formData.append('name', form.name);
      formData.append('species', form.species);
      formData.append('breed', form.breed);
      formData.append('sex', form.sex);
      formData.append('birthdate', form.birthdate);
      if (form.weight) formData.append('weight', form.weight);
      if (form.medical_conditions) formData.append('medical_conditions', form.medical_conditions);

      if (newImage) {
        const filename = newImage.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;
        formData.append('pet_picture', { uri: newImage, name: filename, type });
      }

      const data = await authFetch(`${API_URL}/api/pet-owner/pet/update-pet-data.php`, {
        method: 'POST',
        body: formData,
      });

      if (data?.success) {
        Toast.show({ type: 'success', text1: 'Updated Successfully!' });
        setPet({ ...form, pet_picture: data.new_image_path || pet.pet_picture }); 
        setIsEditing(false); 
      }
    } catch(error) {
      Toast.show({ type: 'error', text1: 'Something went wrong' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // 👇 FIX: Bulletproof boolean check to ensure it reads DB data perfectly
  const isDeceased = Number(pet?.is_deceased) === 1 || pet?.is_deceased === true;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ProfileHeader 
        isEditing={isEditing} 
        petName={pet?.name} 
        activeTab={activeTab} 
        // 👇 FIX: Use undefined instead of null so the component completely ignores the prop
        onToggleEdit={!isDeceased ? toggleEdit : undefined} 
        onBack={() => router.back()} 
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {isDeceased && (
            <View style={styles.deceasedBanner}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="cloud" size={20} color="#6B7280" />
                <AppText style={styles.deceasedBannerText}>Rest in peace, {pet?.name} 🌈</AppText>
              </View>
              <Pressable 
                onPress={handleRestoreLiving} 
                style={({ pressed }) => [
                  styles.undoButton,
                  pressed && styles.buttonPressed
                ]}
              >
                <AppText style={styles.undoButtonText}>Undo</AppText>
              </Pressable>
            </View>
          )}

          <PetAvatarSection 
            pet={pet} 
            newImage={newImage} 
            isEditing={isEditing} 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
            onPickImage={() => !isDeceased && isEditing && pickImage()} 
          />

          {activeTab === 'profile' && (
            <View>
              <ProfileForm 
                form={form} 
                setForm={setForm} 
                isEditing={isEditing} 
                errors={errors} 
                validateField={validateField} 
                showDatePicker={showDatePicker} 
                setShowDatePicker={setShowDatePicker} 
                onDateChange={(e, d) => onDateChange(e, d)} 
                onSave={handleUpdate} 
                saving={saving} 
              />
              
              {!isDeceased && isEditing && (
                <View style={styles.dangerZone}>
                  <AppText style={styles.dangerZoneTitle}>Danger Zone</AppText>
                  
                  <Pressable 
                    onPress={handleMarkDeceased}
                    style={({ pressed }) => [
                      styles.deceasedButton,
                      pressed && styles.buttonPressed
                    ]}
                  >
                    <Ionicons name="heart-dislike-outline" size={18} color="#4B5563" style={{ marginRight: 8 }} />
                    <AppText style={styles.deceasedButtonText}>Report as Passed Away</AppText>
                  </Pressable>

                  <View style={{ height: 16 }} />

                  <Pressable 
                    onPress={handleDeletePet}
                    style={({ pressed }) => [
                      styles.deleteButton,
                      pressed && styles.buttonPressed
                    ]}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" style={{ marginRight: 8 }} />
                    <AppText style={styles.deleteButtonText}>Delete Pet Profile</AppText>
                  </Pressable>
                  
                  <AppText style={styles.dangerZoneDesc}>
                    Use delete for mistakes or duplicates. Use deceased for pets that have passed away.
                  </AppText>
                </View>
              )}
            </View>
          )}

          {activeTab === 'records' && (
            <MedicalRecordsList 
              records={medicalRecords} 
              petName={pet?.name} 
              onRecordPress={(rid) => router.push(`/pets/record/${rid}`)}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg50 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 40 },
  deceasedBanner: {
    backgroundColor: '#F3F4F6', marginHorizontal: 20, marginTop: 10, paddingVertical: 12,
    paddingHorizontal: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', borderWidth: 1, borderColor: '#E5E7EB',
  },
  deceasedBannerText: { color: '#4B5563', fontWeight: '800', fontSize: 13, marginLeft: 8 },
  undoButton: { backgroundColor: Colors.white, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#D1D5DB' },
  undoButtonText: { color: Colors.primary, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  dangerZone: { marginHorizontal: 24, marginTop: 40, paddingTop: 24, borderTopWidth: 1, borderTopColor: '#FCA5A5' },
  dangerZoneTitle: { fontSize: 11, fontWeight: '900', color: '#EF4444', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  deceasedButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#D1D5DB', paddingVertical: 14, borderRadius: 12 },
  deceasedButtonText: { color: '#4B5563', fontWeight: '800', fontSize: 14 },
  deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', paddingVertical: 14, borderRadius: 12 },
  deleteButtonText: { color: '#EF4444', fontWeight: '800', fontSize: 14 },
  dangerZoneDesc: { fontSize: 10, color: '#9CA3AF', textAlign: 'center', marginTop: 12, lineHeight: 15 },
  buttonPressed: { opacity: 0.9, transform: [{ scale: 0.97 }] }
});