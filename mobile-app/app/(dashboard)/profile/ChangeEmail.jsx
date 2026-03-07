import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useUser } from '../../../hooks/useUser';
import { authFetch } from '../../../utils/auth'; 
import AppText from '../../../components/AppText';
import AppButton from '../../../components/AppButton';
import AnimatedWrapper from '../../../components/AnimatedWrapper';
import { Colors } from '../../../constants/Color';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function ChangeEmail() {
  const router = useRouter();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  
  const [newEmail, setNewEmail] = useState('');
  const [error, setError] = useState(null);
  const [isValid, setIsValid] = useState(false); 

  const validateEmail = (emailText) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let currentError = null;
    let currentValid = false;

    if (!emailText.trim()) {
      currentError = "Email address is required";
    } else if (!emailRegex.test(emailText)) {
      currentError = "Please enter a valid email address";
    } else if (emailText.toLowerCase() === user?.email.toLowerCase()) {
      currentError = "This is already your current email";
    } else {
      currentValid = true; 
    }

    setError(currentError);
    setIsValid(currentValid);
    return currentError;
  };

  const handleRequestOTP = async () => {
    Keyboard.dismiss();
    
    // Final check before sending
    const validationError = validateEmail(newEmail);
    if (validationError) return;

    setLoading(true);
    try {
      const res = await authFetch(`${API_URL}/api/pet-owner/profile/send-otp-email.php`, { 
        method: 'POST',
        body: JSON.stringify({ 
          purpose: 'change_email',
          new_email: newEmail.toLowerCase() 
        }) 
      });

      if (res?.success) {
        Toast.show({ type: 'info', text1: 'Verification Required', text2: 'A code was sent to your current email.' });
        
        router.push({
          pathname: '/profile/VerifyOTP',
          params: { 
            email: user?.email, 
            type: 'change_email',
            new_email: newEmail.toLowerCase() 
          }
        });
      } else {
        setError(res?.message || 'Could not send OTP.');
        setIsValid(false);
        Toast.show({ type: 'error', text1: 'Something went wrong' });
      }
    } catch (error) {
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
        <AppText style={styles.headerTitle}>Change email</AppText>
        <View style={{ width: 40 }} /> 
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          <AnimatedWrapper index={0}>
            <AppText style={styles.infoText}>
              To update your email, we need to verify your identity. A verification code will be sent to your <AppText style={{fontWeight: '700', color: Colors.primary}}>current email</AppText> first.
            </AppText>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <AppText style={styles.label}>New Email Address <AppText style={{color: '#EF4444'}}>*</AppText></AppText>
                
                <View style={[
                  styles.inputWrapper, 
                  error && styles.inputErrorBorder,
                  isValid && styles.inputValidBorder
                ]}>
                  <Ionicons 
                    name="mail-outline" 
                    size={20} 
                    color={error ? '#EF4444' : isValid ? '#22C55E' : '#6B7280'} 
                    style={styles.inputIcon} 
                  />
                  <TextInput 
                    style={styles.input} 
                    placeholder="example@gmail.com" 
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={newEmail}
                    onChangeText={(t) => {
                      setNewEmail(t);
                      validateEmail(t); 
                    }}
                  />

                  {isValid && (
                    <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
                  )}
                </View>
                
                {error && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={14} color="#EF4444" />
                    <AppText style={styles.errorText}>{error}</AppText>
                  </View>
                )}
              </View>

              <View style={{ marginTop: 20 }}>
                <AppButton 
                  title="Send Verification Code" 
                  onPress={handleRequestOTP} 
                  loading={loading} 
                  disabled={loading} 
                />
              </View>
            </View>
          </AnimatedWrapper>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15,
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#FFF'
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  scrollContent: { padding: 24, flexGrow: 1 },
  infoText: { fontSize: 14, color: '#6B7280', lineHeight: 22, marginBottom: 30 },
  form: { width: '100%' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#1F1F1F', marginLeft: 4 },
  inputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#D1D5DB', 
    paddingHorizontal: 16, 
    height: 56 
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#1F1F1F', height: '100%' },
  
  inputErrorBorder: { borderColor: '#EF4444', borderWidth: 1 },
  inputValidBorder: { borderColor: '#22C55E', borderWidth: 1 },
  
  errorContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginLeft: 4, gap: 2 },
  errorText: { color: '#EF4444', fontSize: 12, fontWeight: '500' },
});