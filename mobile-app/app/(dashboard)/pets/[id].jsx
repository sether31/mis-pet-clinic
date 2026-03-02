import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker'; 
import { Colors } from '../../../constants/Color';
import { authFetch } from '../../../utils/auth';

// Component Imports
import ProfileHeader from './_components/ProfileHeader';
import PetAvatarSection from './_components/PetAvatarSection';
import ProfileForm from './_components/ProfileForm';
import MedicalRecordsList from './_components/MedicalRecordsList';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function PetProfile() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  
  // UI & Tab State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false); 
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  // Data State
  const [pet, setPet] = useState(null); 
  const [form, setForm] = useState({}); 
  const [newImage, setNewImage] = useState(null); 
  const [errors, setErrors] = useState({}); 
  const [medicalRecords, setMedicalRecords] = useState([]); 

  useEffect(() => {
    if (id) {
      fetchPetDetails();
      fetchMedicalRecords(); 
    }
  }, [id]);

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
      // Revert form back to original pet data if canceled
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

  const pickImage = async () => {
    if (!isEditing) return;
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], 
      allowsEditing: true, 
      aspect: [1, 1], 
      quality: 0.5,
    });
    if (!result.canceled) {
      setNewImage(result.assets[0].uri);
    }
  };

  const onDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowDatePicker(false); 
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0]; 
      setForm({ ...form, birthdate: formattedDate });
      validateField('birthdate', formattedDate);
    }
  };

  const handleUpdate = async () => {
    // Run full validation before saving
    const nError = validateField('name', form.name);
    const sError = validateField('species', form.species);
    const bError = validateField('breed', form.breed);
    const sexError = validateField('sex', form.sex);
    const birthdateError = validateField('birthdate', form.birthdate);
    
    if (nError || sError || bError || sexError || birthdateError) {
      Toast.show({ type: 'error', text1: 'Missing Information', text2: 'Please fill in all required fields.' });
      return;
    }

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
        Toast.show({ type: 'success', text1: 'Updated!', text2: 'Pet profile saved successfully.' });
        // Update local state with new image path if returned
        setPet({ ...form, pet_picture: data.new_image_path || pet.pet_picture }); 
        setIsEditing(false); 
        setNewImage(null);
      } else {
        Toast.show({ type: 'error', text1: 'Something went wrong' });
      }
    } catch(error) {
      Toast.show({ type: 'error', text1: 'Something went wrong' });
    } finally {
      setSaving(false);
    }
  };

  const handleRecordPress = (recordId) => {
    router.push(`/pets/record/${recordId}`);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ProfileHeader 
        isEditing={isEditing} 
        petName={pet?.name} 
        activeTab={activeTab} 
        onToggleEdit={toggleEdit} 
        onBack={() => router.back()} 
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false} 
          keyboardShouldPersistTaps="handled"
        >
          <PetAvatarSection 
            pet={pet} 
            newImage={newImage} 
            isEditing={isEditing} 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
            onPickImage={pickImage} 
          />

          {/* Conditional Tab Rendering */}
          {activeTab === 'profile' && (
            <ProfileForm 
              form={form} 
              setForm={setForm} 
              isEditing={isEditing} 
              errors={errors} 
              validateField={validateField} 
              showDatePicker={showDatePicker} 
              setShowDatePicker={setShowDatePicker} 
              onDateChange={onDateChange} 
              onSave={handleUpdate} 
              saving={saving} 
            />
          )}

          {activeTab === 'records' && (
            <MedicalRecordsList 
              records={medicalRecords} 
              petName={pet?.name} 
              onRecordPress={handleRecordPress}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: Colors.bg50 
  },
  centerContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  scrollContent: { 
    paddingBottom: 40 
  },
});