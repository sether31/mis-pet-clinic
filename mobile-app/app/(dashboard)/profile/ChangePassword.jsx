import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Color';

// Hooks & Utils
import { useUser } from '../../../hooks/useUser';
import { authFetch } from '../../../utils/auth'; 
import AppText from '../../../components/AppText';
import AppButton from '../../../components/AppButton';
import AnimatedWrapper from '../../../components/AnimatedWrapper';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function ChangePassword() {
  const router = useRouter();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({
    new_password: '',
    confirm_password: '',
  });

  const [showPwd, setShowPwd] = useState({ new: false, confirm: false });
  const [errors, setErrors] = useState({});

  const validateField = (name, value, currentFormState) => {
    let error = null;
    if (name === 'new_password') {
      if (!value) error = "Password is required";
      else if (value.length < 6) error = "Password must be at least 6 characters";
    }
    if (name === 'confirm_password') {
      if (value !== currentFormState.new_password) error = "Passwords do not match";
    }
    setErrors(prev => ({ ...prev, [name]: error }));
    return error;
  };

  const handleRequestOTP = async () => {
    Keyboard.dismiss(); 
    setErrors({});
    
    const npError = validateField('new_password', form.new_password, form);
    const cpError = validateField('confirm_password', form.confirm_password, form);
    
    if (npError || cpError) {
      Toast.show({ 
        type: 'error', 
        text1: 'Please fill in all required fields correctly.' 
      });
      return;
    }

    setLoading(true);
    try {
      const res = await authFetch(`${API_URL}/api/pet-owner/profile/send-otp-password.php`, { 
        method: 'POST',
        body: JSON.stringify({ purpose: 'change_password' }) 
      });

      if (res?.success) {
        Toast.show({ type: 'info', text1: 'Verification Required', text2: 'An OTP has been sent.' });
        
        router.push({
          pathname: '/profile/VerifyOTP',
          params: { 
            email: user?.email, 
            type: 'change_password',
            new_password: form.new_password 
          }
        });
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: res?.message || 'Could not send OTP.' });
      }
    } catch (error) {
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
        <AppText style={styles.headerTitle}>Change Password</AppText>
        <View style={{ width: 40 }} /> 
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          keyboardShouldPersistTaps="handled"
        >
          <AnimatedWrapper index={0}>
            <AppText style={styles.infoText}>Enter your new password below. It must be at least 6 characters long.</AppText>

            <View style={styles.form}>
              {/* New Password */}
              <View style={styles.inputGroup}>
                <AppText style={styles.label}>New Password <AppText style={{color: '#EF4444'}}>*</AppText></AppText>
                <View style={[styles.inputWrapper, errors.new_password && styles.inputErrorBorder]}>
                  <Ionicons name="lock-closed-outline" size={20} color={errors.new_password ? '#EF4444' : '#9CA3AF'} style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input} 
                    placeholder="Minimum 6 characters" 
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showPwd.new}
                    value={form.new_password}
                    onChangeText={(t) => { 
                      const updatedForm = {...form, new_password: t};
                      setForm(updatedForm); 
                      validateField('new_password', t, updatedForm); 
                      if (form.confirm_password) validateField('confirm_password', form.confirm_password, updatedForm);
                    }}
                  />
                  <TouchableOpacity onPress={() => setShowPwd({...showPwd, new: !showPwd.new})} style={styles.eyeIcon}>
                    <Ionicons name={showPwd.new ? "eye-off-outline" : "eye-outline"} size={22} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
                {errors.new_password && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={14} color="#EF4444" />
                    <AppText style={styles.errorText}>{errors.new_password}</AppText>
                  </View>
                )}
              </View>

              {/* Confirm Password */}
              <View style={styles.inputGroup}>
                <AppText style={styles.label}>Confirm New Password <AppText style={{color: '#EF4444'}}>*</AppText></AppText>
                <View style={[styles.inputWrapper, errors.confirm_password && styles.inputErrorBorder]}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={errors.confirm_password ? '#EF4444' : '#9CA3AF'} style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input} 
                    placeholder="Re-type new password" 
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showPwd.confirm}
                    value={form.confirm_password}
                    onChangeText={(t) => { 
                      const updatedForm = {...form, confirm_password: t};
                      setForm(updatedForm); 
                      validateField('confirm_password', t, updatedForm); 
                    }}
                  />
                  <TouchableOpacity onPress={() => setShowPwd({...showPwd, confirm: !showPwd.confirm})} style={styles.eyeIcon}>
                    <Ionicons name={showPwd.confirm ? "eye-off-outline" : "eye-outline"} size={22} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
                {errors.confirm_password && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={14} color="#EF4444" />
                    <AppText style={styles.errorText}>{errors.confirm_password}</AppText>
                  </View>
                )}
              </View>

              <View style={{ marginTop: 20 }}>
                <AppButton title="Send OTP Code" onPress={handleRequestOTP} loading={loading} />
              </View>
            </View>
          </AnimatedWrapper>
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
  infoText: { fontSize: 14, color: '#6B7280', lineHeight: 22, marginBottom: 24 },
  form: { width: '100%' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#374151', marginLeft: 4 },
  inputWrapper: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', 
    borderRadius: 12, borderWidth: 1, borderColor: '#D1D5DB', 
    paddingHorizontal: 16, height: 56 
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#111827', height: '100%' },
  inputErrorBorder: { borderColor: '#EF4444', borderWidth: 1.5 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginLeft: 4, gap: 2 },
  errorText: { color: '#EF4444', fontSize: 12, fontWeight: '500' },
  eyeIcon: { padding: 8 },
});