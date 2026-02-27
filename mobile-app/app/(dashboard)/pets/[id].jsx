import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Image, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker'; 
import DateTimePicker from '@react-native-community/datetimepicker'; 
import { Colors } from '../../../constants/Color';
import { authFetch } from '../../../utils/auth';

import AppText from '../../../components/AppText';
import AppButton from '../../../components/AppButton';
import AnimatedWrapper from '../../../components/AnimatedWrapper';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const PLACEHOLDER_IMAGE = require('../../../assets/images/no-image.jpg');
const MAX_MEDICAL_LENGTH = 200;

export default function PetProfile() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false); 
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [pet, setPet] = useState(null); 
  const [form, setForm] = useState({}); 
  const [newImage, setNewImage] = useState(null); 
  const [errors, setErrors] = useState({}); 

  useEffect(() => {
    if (id) fetchPetDetails();
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
      console.error(error);
    } finally {
      setLoading(false);
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

  const pickImage = async () => {
    if (!isEditing) return;
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.5,
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
        setPet({ ...form, pet_picture: data.new_image_path || pet.pet_picture }); 
        setIsEditing(false); 
        setNewImage(null);
      } else {
        Toast.show({ type: 'error', text1: 'Update Failed', text2: data?.message });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Network Error' });
    } finally {
      setSaving(false);
    }
  };

  const getDisplayImage = () => {
    if (newImage) return { uri: newImage }; 
    if (pet?.pet_picture && pet.pet_picture.trim() !== "") {
      const cleanPath = pet.pet_picture.startsWith('/') ? pet.pet_picture.substring(1) : pet.pet_picture;
      return { uri: `${API_URL}/${cleanPath}` };
    }
    return PLACEHOLDER_IMAGE;
  };

  const displayDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const [year, month, day] = dateString.split('-');
      return new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) { return dateString; }
  };

  if (loading) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => isEditing ? toggleEdit() : router.back()}>
          <Ionicons name={isEditing ? "close" : "arrow-back"} size={26} color="#111827" />
        </TouchableOpacity>
        <AppText style={styles.headerTitle}>{isEditing ? 'Edit Profile' : 'Pet Profile'}</AppText>
        <TouchableOpacity onPress={toggleEdit} style={{ padding: 8 }}>
          <AppText style={{ color: isEditing ? '#6B7280' : Colors.primary, fontWeight: '700' }}>
            {isEditing ? 'Cancel' : 'Edit'}
          </AppText>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          {/* Image Section */}
          <AnimatedWrapper index={0} style={styles.imageSection}>
            <TouchableOpacity onPress={pickImage} disabled={!isEditing} activeOpacity={0.8}>
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
              </>
            )}
          </AnimatedWrapper>

          <View style={styles.formContainer}>
            
            {/* Pet Name */}
            <AnimatedWrapper index={1} style={styles.inputGroup}>
              <AppText style={styles.label}>Pet Name {isEditing && <AppText style={{color: '#EF4444'}}>*</AppText>}</AppText>
              <View style={[styles.inputWrapper, isEditing && styles.inputWrapperActive, errors.name && styles.inputErrorBorder]}>
                <Ionicons name="paw-outline" size={20} color={errors.name ? '#EF4444' : (isEditing ? Colors.primary : "#9CA3AF")} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  value={form?.name} 
                  editable={isEditing} 
                  onChangeText={(t) => { setForm({...form, name: t}); validateField('name', t); }}
                />
              </View>
              {errors.name && isEditing && <AppText style={styles.errorText}>{errors.name}</AppText>}
            </AnimatedWrapper>

            {/* Species */}
            <AnimatedWrapper index={1.5} style={styles.inputGroup}>
              <AppText style={styles.label}>Species {isEditing && <AppText style={{color: '#EF4444'}}>*</AppText>}</AppText>
              <View style={[styles.inputWrapper, isEditing && styles.inputWrapperActive, errors.species && styles.inputErrorBorder]}>
                <Ionicons name="list-outline" size={20} color={errors.species ? '#EF4444' : (isEditing ? Colors.primary : "#9CA3AF")} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  value={form?.species} 
                  editable={isEditing} 
                  maxLength={30}
                  onChangeText={(t) => { setForm({...form, species: t}); validateField('species', t); }}
                />
              </View>
              {errors.species && isEditing && <AppText style={styles.errorText}>{errors.species}</AppText>}
            </AnimatedWrapper>

            {/* Breed */}
            <AnimatedWrapper index={2} style={styles.inputGroup}>
              <AppText style={styles.label}>Breed {isEditing && <AppText style={{color: '#EF4444'}}>*</AppText>}</AppText>
              <View style={[styles.inputWrapper, isEditing && styles.inputWrapperActive, errors.breed && styles.inputErrorBorder]}>
                <Ionicons name="color-filter-outline" size={20} color={errors.breed ? '#EF4444' : (isEditing ? Colors.primary : "#9CA3AF")} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  value={form?.breed} 
                  editable={isEditing} 
                  onChangeText={(t) => { setForm({...form, breed: t}); validateField('breed', t); }}
                />
              </View>
              {errors.breed && isEditing && <AppText style={styles.errorText}>{errors.breed}</AppText>}
            </AnimatedWrapper>

            {/* Sex Display / Edit Toggle */}
            <AnimatedWrapper index={3} style={styles.inputGroup}>
              <AppText style={styles.label}>Sex {isEditing && <AppText style={{color: '#EF4444'}}>*</AppText>}</AppText>
              {isEditing ? (
                <>
                  <View style={styles.sexRow}>
                    <TouchableOpacity 
                      style={[styles.sexBtn, form?.sex?.toLowerCase() === 'male' && styles.sexBtnActive]} 
                      onPress={() => { setForm({...form, sex: 'Male'}); validateField('sex', 'Male'); }}
                    >
                      <Ionicons name="male" size={20} color={form?.sex?.toLowerCase() === 'male' ? Colors.primary : '#9CA3AF'} />
                      <AppText style={[styles.sexText, form?.sex?.toLowerCase() === 'male' && styles.sexTextActive]}>Male</AppText>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.sexBtn, form?.sex?.toLowerCase() === 'female' && styles.sexBtnActive]} 
                      onPress={() => { setForm({...form, sex: 'Female'}); validateField('sex', 'Female'); }}
                    >
                      <Ionicons name="female" size={20} color={form?.sex?.toLowerCase() === 'female' ? Colors.primary : '#9CA3AF'} />
                      <AppText style={[styles.sexText, form?.sex?.toLowerCase() === 'female' && styles.sexTextActive]}>Female</AppText>
                    </TouchableOpacity>
                  </View>
                  {errors.sex && <AppText style={styles.errorText}>{errors.sex}</AppText>}
                </>
              ) : (
                <View style={styles.inputWrapper}>
                  <Ionicons name={form?.sex?.toLowerCase() === 'male' ? "male-outline" : "female-outline"} size={20} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput style={[styles.input, {textTransform: 'capitalize'}]} value={form?.sex || 'N/A'} editable={false} />
                </View>
              )}
            </AnimatedWrapper>

            <View style={styles.row}>
                {/* Weight */}
                <AnimatedWrapper index={4} style={[styles.inputGroup, { flex: 1 }]}>
                  <AppText style={styles.label}>Weight (kg)</AppText>
                  <View style={[styles.inputWrapper, isEditing && styles.inputWrapperActive]}>
                    <Ionicons name="scale-outline" size={20} color={isEditing ? Colors.primary : "#9CA3AF"} style={styles.inputIcon} />
                    <TextInput 
                      style={styles.input} 
                      value={form?.weight ? form.weight.toString() : ''} 
                      keyboardType="decimal-pad"
                      editable={isEditing} 
                      onChangeText={(t) => setForm({...form, weight: t.replace(/[^0-9.]/g, '')})}
                    />
                  </View>
                </AnimatedWrapper>

                {/* Birthdate */}
                <AnimatedWrapper index={5} style={[styles.inputGroup, { flex: 1.2 }]}>
                  <AppText style={styles.label}>Birthdate {isEditing && <AppText style={{color: '#EF4444'}}>*</AppText>}</AppText>
                  <TouchableOpacity 
                    style={[styles.inputWrapper, isEditing && styles.inputWrapperActive, errors.birthdate && styles.inputErrorBorder]}
                    disabled={!isEditing}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={20} color={errors.birthdate ? '#EF4444' : (isEditing ? Colors.primary : "#9CA3AF")} style={styles.inputIcon} />
                    <AppText style={styles.input}>{displayDate(form?.birthdate)}</AppText>
                  </TouchableOpacity>
                  {errors.birthdate && isEditing && <AppText style={styles.errorText}>{errors.birthdate}</AppText>}
                  
                  {showDatePicker && isEditing && (
                    <DateTimePicker value={form.birthdate ? new Date(form.birthdate) : new Date()} mode="date" display="default" maximumDate={new Date()} onChange={onDateChange} />
                  )}
                </AnimatedWrapper>
            </View>

            {/* Medical Conditions */}
            <AnimatedWrapper index={6} style={styles.inputGroup}>
              <AppText style={styles.label}>Medical Conditions & Allergies</AppText>
              <View style={[styles.textAreaWrapper, isEditing && styles.inputWrapperActive]}>
                <TextInput 
                  style={styles.textArea} 
                  value={form?.medical_conditions} 
                  multiline 
                  editable={isEditing} 
                  maxLength={MAX_MEDICAL_LENGTH}
                  onChangeText={(t) => setForm({...form, medical_conditions: t})}
                  placeholder={isEditing ? "Add conditions..." : "No recorded medical conditions."}
                />
              </View>
              {isEditing && (
                <View style={styles.helperRow}>
                  <View style={{ flex: 1 }} />
                  <AppText style={[styles.charCounter, (form?.medical_conditions?.length || 0) === MAX_MEDICAL_LENGTH && { color: '#EF4444' }]}>
                    {form?.medical_conditions?.length || 0}/{MAX_MEDICAL_LENGTH}
                  </AppText>
                </View>
              )}
            </AnimatedWrapper>

            {isEditing && (
              <AnimatedWrapper index={7} style={{ marginTop: 10 }}>
                <AppButton title="Save Changes" onPress={handleUpdate} loading={saving} />
              </AnimatedWrapper>
            )}

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg50 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  scrollContent: { paddingBottom: 40 },
  
  imageSection: { alignItems: 'center', paddingVertical: 30, backgroundColor: Colors.white },
  imageWrapper: { width: 120, height: 120, borderRadius: 60, backgroundColor: Colors.bg50, elevation: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, borderWidth: 4, borderColor: Colors.white, overflow: 'hidden', marginBottom: 16, position: 'relative' },
  petImage: { width: '100%', height: '100%' },
  editBadge: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 6, alignItems: 'center' },
  petMainName: { fontSize: 24, fontWeight: '900', color: '#111827', textTransform: 'capitalize' },
  petSubText: { fontSize: 15, color: '#6B7280', marginTop: 4, fontWeight: '500', textTransform: 'capitalize' },

  formContainer: { paddingHorizontal: 28, marginTop: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginLeft: 4, color: '#374151' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 16, height: 54 },
  inputWrapperActive: { borderColor: Colors.primary, backgroundColor: '#F9FAFB' }, 
  inputErrorBorder: { borderColor: '#EF4444', borderWidth: 1.5 }, 
  errorText: { color: '#EF4444', fontSize: 12, fontWeight: '500', marginTop: 6, marginLeft: 4 }, 
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#111827', fontWeight: '500' },
  row: { flexDirection: 'row', gap: 12 },
  
  sexRow: { flexDirection: 'row', gap: 12 },
  sexBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 54, backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', gap: 8 },
  sexBtnActive: { borderColor: Colors.primary, borderWidth: 2, backgroundColor: Colors.primary + '10' },
  sexText: { fontSize: 16, fontWeight: '600', color: '#6B7280' },
  sexTextActive: { color: Colors.primary },

  textAreaWrapper: { backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 16, paddingVertical: 12, minHeight: 100 },
  textArea: { flex: 1, fontSize: 15, color: '#111827', textAlignVertical: 'top', lineHeight: 22 },
  
  helperRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 6, paddingHorizontal: 4 },
  charCounter: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
});