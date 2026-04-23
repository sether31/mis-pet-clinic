import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker'; 
import DateTimePicker from '@react-native-community/datetimepicker'; 
import { Colors } from '../../../constants/Color';

import { authFetch } from '../../../utils/auth'; 

// Components
import AppText from '../../../components/AppText';
import AppButton from '../../../components/AppButton';
import AnimatedWrapper from '../../../components/AnimatedWrapper';

const COMMON_SPECIES = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Other'];

export default function CreatePet() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customSpecies, setCustomSpecies] = useState(''); 
  const [showDatePicker, setShowDatePicker] = useState(false); 
  
  const [form, setForm] = useState({
    pet_picture: null, 
    name: '',
    species: '', 
    breed: '',
    sex: '', 
    birthdate: '', 
    weight: '',
    medical_conditions: '', 
  });
  
  const [errors, setErrors] = useState({});

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1], 
      quality: 0.5,
    });

    if (!result.canceled) {
      setForm({ ...form, pet_picture: result.assets[0].uri });
    }
  };

  const onDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowDatePicker(false); 
    
    if (selectedDate) {
      // Standardize to YYYY-MM-DD for the database
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      
      setForm({ ...form, birthdate: formattedDate });
      validateField('birthdate', formattedDate);
    }
  };

  const validateField = (name, value) => {
    let error = null;
    // 1. ADDED 'breed' AND 'birthdate' TO OPTIONAL FIELDS
    const optionalFields = ['weight', 'medical_conditions', 'pet_picture', 'breed', 'birthdate']; 

    if (!value?.trim() && !optionalFields.includes(name)) {
      if (name === 'name') error = "Pet name is required";
      else if (name === 'species') error = "Species is required";
      else if (name === 'sex') error = "Sex is required";
    }

    setErrors(prev => ({ ...prev, [name]: error }));
    return error;
  };

  const getWrapperStyle = (name) => {
    if (errors[name]) return styles.inputErrorBorder;
    if (form[name] && !errors[name]) return styles.inputSuccessBorder;
    return null;
  };

  const handleSavePet = async () => {
    const finalSpecies = form.species === 'Other' ? customSpecies : form.species;
    
    // 2. VALIDATE ONLY THE STRICTLY REQUIRED FIELDS
    const nError = validateField('name', form.name);
    const sError = validateField('species', finalSpecies);
    const sexError = validateField('sex', form.sex);
    
    if (nError || sError || sexError) {
      Toast.show({ type: 'error', text1: 'Please fill in all required inputs correctly.' });
      return;
    }

    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('species', finalSpecies);
      formData.append('sex', form.sex);
      
      // 3. APPEND OPTIONALS ONLY IF THEY HAVE VALUES
      formData.append('breed', form.breed || ''); 
      formData.append('birthdate', form.birthdate || ''); 
      formData.append('weight', form.weight || '');
      formData.append('medical_conditions', form.medical_conditions || '');

      if (form.pet_picture) {
        const filename = form.pet_picture.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        formData.append('pet_picture', {
          uri: form.pet_picture,
          name: filename,
          type: type,
        });
      }

      const apiUrl = `${process.env.EXPO_PUBLIC_API_URL}/api/pet-owner/pet/create-pet.php`;

      const data = await authFetch(apiUrl, {
        method: 'POST',
        body: formData,
      });

      if (data?.error) {
        setLoading(false);
        return; 
      }

      if (data.success) {
        Toast.show({ type: 'success', text1: 'Pet Added!', text2: data.message });
        router.back(); 
      } else {
        Toast.show({ type: 'error', text1: 'Create Failed', text2: data.message });
      }

    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Something went wrong' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <AppText style={styles.headerTitle}>Add New Pet</AppText>
        <View style={{ width: 40 }} /> 
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0} 
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled" 
          bounces={false}
          overScrollMode="never"
        >
          <AnimatedWrapper index={0} style={styles.imageContainer}>
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              {form.pet_picture ? (
                <Image source={{ uri: form.pet_picture }} style={styles.petImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="camera" size={32} color="#9CA3AF" />
                  <AppText style={styles.imageText}>Add Photo</AppText>
                </View>
              )}
              <View style={styles.editBadge}>
                <Ionicons name="pencil" size={14} color="#FFF" />
              </View>
            </TouchableOpacity>
          </AnimatedWrapper>

          <View style={styles.form}>
            {/* Pet Name - REQUIRED */}
            <AnimatedWrapper index={1} style={styles.inputGroup}>
              <AppText style={styles.label}>Pet Name <AppText style={{color: '#EF4444'}}>*</AppText></AppText>
              <View style={[styles.inputWrapper, getWrapperStyle('name')]}>
                <Ionicons name="paw-outline" size={20} color={errors.name ? '#EF4444' : '#9CA3AF'} />
                <TextInput 
                  style={styles.input} 
                  placeholder="ex. Molly" 
                  value={form.name}
                  onChangeText={(t) => { setForm({...form, name: t}); validateField('name', t); }}
                />
              </View>
              {errors.name && <AppText style={styles.errorText}>{errors.name}</AppText>}
            </AnimatedWrapper>

            {/* Species - REQUIRED */}
            <AnimatedWrapper index={2} style={styles.inputGroup}>
              <AppText style={styles.label}>Species <AppText style={{color: '#EF4444'}}>*</AppText></AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipContainer}>
                {COMMON_SPECIES.map((s) => (
                  <TouchableOpacity 
                    key={s} 
                    style={[styles.chip, form.species === s && styles.chipActive]}
                    onPress={() => { setForm({...form, species: s}); validateField('species', s); }}
                  >
                    <AppText style={[styles.chipText, form.species === s && styles.chipTextActive]}>{s}</AppText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {form.species === 'Other' && (
                <View style={[styles.inputWrapper, { marginTop: 12 }, errors.species && styles.inputErrorBorder]}>
                  <TextInput 
                    style={styles.input} 
                    placeholder="Type species..." 
                    maxLength={30}
                    value={customSpecies}
                    onChangeText={(t) => { setCustomSpecies(t); validateField('species', t); }}
                  />
                </View>
              )}
              {errors.species && <AppText style={styles.errorText}>{errors.species}</AppText>}
            </AnimatedWrapper>

            {/* Breed - OPTIONAL */}
            <AnimatedWrapper index={3} style={styles.inputGroup}>
              <AppText style={styles.label}>Breed</AppText>
              <View style={[styles.inputWrapper, getWrapperStyle('breed')]}>
                <Ionicons name="color-filter-outline" size={20} color={errors.breed ? '#EF4444' : '#9CA3AF'} />
                <TextInput 
                  style={styles.input} 
                  placeholder="ex. Golden Retriever" 
                  value={form.breed}
                  onChangeText={(t) => { setForm({...form, breed: t}); validateField('breed', t); }}
                />
              </View>
              {errors.breed && <AppText style={styles.errorText}>{errors.breed}</AppText>}
            </AnimatedWrapper>

            {/* Sex - REQUIRED */}
            <AnimatedWrapper index={4} style={styles.inputGroup}>
              <AppText style={styles.label}>Sex <AppText style={{color: '#EF4444'}}>*</AppText></AppText>
              <View style={styles.sexRow}>
                <TouchableOpacity 
                  style={[styles.sexBtn, form.sex === 'Male' && styles.sexBtnActive]}
                  onPress={() => { setForm({...form, sex: 'Male'}); validateField('sex', 'Male'); }}
                >
                  <Ionicons name="male" size={20} color={form.sex === 'Male' ? Colors.primary : '#9CA3AF'} />
                  <AppText style={[styles.sexText, form.sex === 'Male' && styles.sexTextActive]}>Male</AppText>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.sexBtn, form.sex === 'Female' && styles.sexBtnActive]}
                  onPress={() => { setForm({...form, sex: 'Female'}); validateField('sex', 'Female'); }}
                >
                  <Ionicons name="female" size={20} color={form.sex === 'Female' ? Colors.primary : '#9CA3AF'} />
                  <AppText style={[styles.sexText, form.sex === 'Female' && styles.sexTextActive]}>Female</AppText>
                </TouchableOpacity>
              </View>
              {errors.sex && <AppText style={styles.errorText}>{errors.sex}</AppText>}
            </AnimatedWrapper>

            {/* Date and Weight - OPTIONAL */}
            <AnimatedWrapper index={5} style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1.5 }]}>
                <AppText style={styles.label}>Date of Birth</AppText>
                <TouchableOpacity 
                  style={[styles.inputWrapper, getWrapperStyle('birthdate')]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color={errors.birthdate ? '#EF4444' : '#9CA3AF'} />
                  <AppText style={{ flex: 1, fontSize: 16, color: form.birthdate ? '#111827' : '#9CA3AF' }}>
                    {form.birthdate || 'Select Date'}
                  </AppText>
                </TouchableOpacity>
                {errors.birthdate && <AppText style={styles.errorText}>{errors.birthdate}</AppText>}

                {showDatePicker && (
                  <DateTimePicker
                    value={form.birthdate ? new Date(form.birthdate) : new Date()}
                    mode="date"
                    display="default"
                    maximumDate={new Date()} 
                    onChange={onDateChange}
                  />
                )}
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <AppText style={styles.label}>Weight (kg)</AppText>
                <View style={styles.inputWrapper}>
                  <Ionicons name="scale-outline" size={20} color="#9CA3AF" />
                  <TextInput 
                    style={styles.input} 
                    placeholder="ex. 15" 
                    keyboardType="decimal-pad" 
                    value={form.weight}
                    onChangeText={(t) => {
                       const cleanNumber = t.replace(/[^0-9.]/g, '');
                       setForm({...form, weight: cleanNumber});
                    }}
                  />
                </View>
              </View>
            </AnimatedWrapper>

            {/* Medical */}
            <AnimatedWrapper index={6} style={styles.inputGroup}>
              <AppText style={styles.label}>Medical Conditions & Allergies</AppText>
              <View style={styles.textAreaWrapper}>
                <TextInput 
                  style={styles.textArea} 
                  placeholder="List any conditions or allergies..." 
                  multiline={true}
                  numberOfLines={4}
                  value={form.medical_conditions}
                  onChangeText={(t) => setForm({...form, medical_conditions: t})}
                />
              </View>
            </AnimatedWrapper>

            <AnimatedWrapper index={7} style={{ marginTop: 10 }}>
              <AppButton title="Save Pet Profile" onPress={handleSavePet} loading={loading} />
            </AnimatedWrapper>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg50 },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15,
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#FFF'
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  scrollContent: { padding: 24, paddingBottom: 120, flexGrow: 1 },
  imageContainer: { alignItems: 'center', marginBottom: 24, marginTop: 10 },
  imagePicker: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#E5E7EB',
    alignItems: 'center', justifyContent: 'center', position: 'relative',
    borderWidth: 2, borderColor: '#FFF', elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5
  },
  petImage: { width: '100%', height: '100%', borderRadius: 50 },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  imageText: { fontSize: 12, color: '#6B7280', marginTop: 4, fontWeight: '600' },
  editBadge: {
    position: 'absolute', bottom: 0, right: 0, backgroundColor: Colors.primary,
    width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFF'
  },
  form: { width: '100%' },
  row: { flexDirection: 'row', gap: 12 }, 
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#374151', marginLeft: 4 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    borderRadius: 12, borderWidth: 1, borderColor: '#D1D5DB', 
    paddingHorizontal: 16, height: 56, gap: 12
  },
  input: { flex: 1, fontSize: 16, color: '#111827' },
  chipContainer: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFF',
    borderRadius: 20, borderWidth: 1, borderColor: '#D1D5DB', marginRight: 8
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 14, fontWeight: '600', color: '#4B5563' },
  chipTextActive: { color: '#FFF' },
  textAreaWrapper: {
    backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#D1D5DB', 
    paddingHorizontal: 16, paddingVertical: 12, minHeight: 120
  },
  textArea: { flex: 1, fontSize: 16, color: '#111827', textAlignVertical: 'top' },
  inputErrorBorder: { borderColor: '#EF4444', borderWidth: 1.5 },
  inputSuccessBorder: { borderColor: '#10B981', borderWidth: 1.5 },
  errorText: { color: '#EF4444', fontSize: 12, fontWeight: '500', marginTop: 6, marginLeft: 4 },
  sexRow: { flexDirection: 'row', gap: 12 },
  sexBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 56, backgroundColor: '#FFF', borderRadius: 12, 
    borderWidth: 1, borderColor: '#D1D5DB', gap: 8
  },
  sexBtnActive: { borderColor: Colors.primary, borderWidth: 2, backgroundColor: Colors.primary + '10' },
  sexText: { fontSize: 16, fontWeight: '600', color: '#6B7280' },
  sexTextActive: { color: Colors.primary },
});