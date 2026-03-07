import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker'; 
import { Colors } from '../../../constants/Color';

// Hooks & Utils
import { useUser } from '../../../hooks/useUser';
import { authFetch } from '../../../utils/auth'; 

// Components
import AppText from '../../../components/AppText';
import AppButton from '../../../components/AppButton';
import AnimatedWrapper from '../../../components/AnimatedWrapper';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const DEFAULT_IMAGE = require('../../../assets/images/no-image.jpg');

export default function EditProfile() {
  const router = useRouter();
  
  const { user, refreshUser } = useUser(); 
  
  const [loading, setLoading] = useState(false);
  const [newImageUri, setNewImageUri] = useState(null); 
  
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.fname || '',
        last_name: user.lname || '',
        phone_number: user.phone_number || '',
      });
    }
  }, [user]);

  const getDisplayImage = () => {
    if (newImageUri) return { uri: newImageUri };
    if (user?.profile_picture) {
      const cleanPath = user.profile_picture.startsWith('/') ? user.profile_picture.substring(1) : user.profile_picture;
      return { uri: `${API_URL}/${cleanPath}` };
    }
    return DEFAULT_IMAGE;
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1], 
      quality: 0.5,
    });

    if (!result.canceled) {
      setNewImageUri(result.assets[0].uri);
    }
  };

  // 💥 DYNAMIC VALIDATOR: Checks instantly when called
  const validateField = (name, value) => {
    let error = null;
    
    if (!value || !value.trim()) {
      if (name === 'first_name') error = "First name is required";
      if (name === 'last_name') error = "Last name is required";
    }
    
    setErrors(prev => ({ ...prev, [name]: error }));
    return error;
  };

  const handleSaveProfile = async () => {
    // 💥 Check both required fields when Submit is clicked
    const fnError = validateField('first_name', form.first_name);
    const lnError = validateField('last_name', form.last_name);
    
    if (fnError || lnError) {
      // 💥 EXACT Toast message you requested
      Toast.show({ type: 'error', text1: 'Please fill in all required fields correctly.' });
      return;
    }

    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('first_name', form.first_name);
      formData.append('last_name', form.last_name);
      
      if (form.phone_number) {
        formData.append('phone_number', form.phone_number);
      }

      if (newImageUri) {
        const filename = newImageUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        formData.append('profile_picture', {
          uri: newImageUri,
          name: filename,
          type: type,
        });
      }

      const res = await authFetch(`${API_URL}/api/pet-owner/profile/update-profile.php`, {
        method: 'POST',
        body: formData,
      });

      if (res?.success) {
        await refreshUser(); 
        Toast.show({ type: 'success', text1: 'Profile Updated!', text2: res.message });
        router.back(); 
      } else {
        Toast.show({ type: 'error', text1: 'Update Failed', text2: res?.message || 'Something went wrong.' });
      }

    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Network Error', text2: 'Could not connect to the server.' });
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
        <AppText style={styles.headerTitle}>Edit Profile</AppText>
        <View style={{ width: 40 }} /> 
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled" 
        >
          {/* Avatar Section */}
          <AnimatedWrapper index={0} style={styles.imageContainer}>
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              <Image source={getDisplayImage()} style={styles.avatarImage} />
              <View style={styles.editBadge}>
                <Ionicons name="camera" size={14} color="#FFF" />
              </View>
            </TouchableOpacity>
            <AppText style={styles.emailText}>{user?.email}</AppText>
          </AnimatedWrapper>

          <View style={styles.form}>
            {/* First Name */}
            <AnimatedWrapper index={1} style={styles.inputGroup}>
              <AppText style={styles.label}>First Name <AppText style={{color: '#EF4444'}}>*</AppText></AppText>
              <View style={[styles.inputWrapper, errors.first_name && styles.inputErrorBorder]}>
                <Ionicons name="person-outline" size={20} color={errors.first_name ? '#EF4444' : '#9CA3AF'} />
                <TextInput 
                  style={styles.input} 
                  placeholder="ex. Juan" 
                  value={form.first_name}
                  onChangeText={(t) => { 
                    setForm({...form, first_name: t}); 
                    validateField('first_name', t);
                  }}
                />
              </View>
              {errors.first_name && <AppText style={styles.errorText}>{errors.first_name}</AppText>}
            </AnimatedWrapper>

            {/* Last Name */}
            <AnimatedWrapper index={2} style={styles.inputGroup}>
              <AppText style={styles.label}>Last Name <AppText style={{color: '#EF4444'}}>*</AppText></AppText>
              <View style={[styles.inputWrapper, errors.last_name && styles.inputErrorBorder]}>
                <Ionicons name="person-outline" size={20} color={errors.last_name ? '#EF4444' : '#9CA3AF'} />
                <TextInput 
                  style={styles.input} 
                  placeholder="ex. Dela Cruz" 
                  value={form.last_name}
                  onChangeText={(t) => { 
                    setForm({...form, last_name: t}); 
                    validateField('last_name', t);
                  }}
                />
              </View>
              {errors.last_name && <AppText style={styles.errorText}>{errors.last_name}</AppText>}
            </AnimatedWrapper>

            {/* Phone Number (Still Optional) */}
            <AnimatedWrapper index={3} style={styles.inputGroup}>
              <AppText style={styles.label}>Phone Number</AppText>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={20} color="#9CA3AF" />
                <TextInput 
                  style={styles.input} 
                  placeholder="ex. 09123456789" 
                  keyboardType="phone-pad"
                  value={form.phone_number}
                  onChangeText={(t) => {
                    const cleanNumber = t.replace(/[^0-9]/g, '');
                    setForm({...form, phone_number: cleanNumber});
                  }}
                  maxLength={11}
                />
              </View>
            </AnimatedWrapper>

            {/* Save Button */}
            <AnimatedWrapper index={4} style={{ marginTop: 20 }}>
              <AppButton title="Save Changes" onPress={handleSaveProfile} loading={loading} />
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
  
  imageContainer: { alignItems: 'center', marginBottom: 30, marginTop: 10 },
  
  imagePicker: {
    width: 110, height: 110, borderRadius: 55, backgroundColor: '#E5E7EB',
    alignItems: 'center', justifyContent: 'center', position: 'relative',
    borderWidth: 1, borderColor: '#D1D5DB' 
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 55, resizeMode: 'cover' },
  editBadge: {
    position: 'absolute', bottom: 0, right: 0, backgroundColor: Colors.primary,
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#FFF'
  },
  emailText: { fontSize: 14, color: '#6B7280', fontWeight: '500', marginTop: 12 },
  
  form: { width: '100%' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#374151', marginLeft: 4 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    borderRadius: 12, borderWidth: 1, borderColor: '#D1D5DB', 
    paddingHorizontal: 16, height: 56, gap: 12
  },
  input: { flex: 1, fontSize: 16, color: '#111827' },
  inputErrorBorder: { borderColor: '#EF4444', borderWidth: 1.5 },
  errorText: { color: '#EF4444', fontSize: 12, fontWeight: '500', marginTop: 6, marginLeft: 4 },
});