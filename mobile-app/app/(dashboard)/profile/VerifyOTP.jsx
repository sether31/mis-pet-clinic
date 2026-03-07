import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Keyboard } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Hooks
import { useUI } from '../../../hooks/useUI';
import { useUser } from '../../../hooks/useUser'; 
import { authFetch } from '../../../utils/auth'; 

// Components
import AppText from '../../../components/AppText';
import AppButton from '../../../components/AppButton';
import OTPInput from '../../../components/OTPInput'; 
import AnimatedWrapper from '../../../components/AnimatedWrapper';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function VerifyOTP() {
  const router = useRouter();
  const { email, type, new_password, new_email } = useLocalSearchParams();
  
  const { showLoader, hideLoader, loading } = useUI(); 
  const { refreshUser } = useUser(); 

  const [otp, setOtp] = useState('');
  const [serverError, setServerError] = useState(null); 

  const handleOtpComplete = (code) => {
    setOtp(code);
    setServerError(null); 
  };

  const handleVerify = async () => {
    if (otp.length < 6) {
      setServerError("Please enter the 6-digit code.");
      return;
    }

    showLoader('Verifying...');
    setServerError(null);

    try {
      let endpoint = "";
      let body = { otp };

      if (type === 'change_password') {
        endpoint = `${API_URL}/api/pet-owner/profile/verify-otp-password.php`;
        body.new_password = new_password;
      } else if (type === 'change_email') {
        endpoint = `${API_URL}/api/pet-owner/profile/verify-otp-email.php`;
        body.new_email = new_email;
      }

      const res = await authFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (res?.success) {
        Toast.show({ 
          type: 'success', 
          text1: 'Update Successful!', 
          text2: res.message 
        });
        
        if (type === 'change_email' && refreshUser) {
          await refreshUser(); 
        }
        
        router.dismiss(2); 
      } else {
        setOtp(''); 
        setServerError(res?.message || "Invalid verification code.");
      }
    } catch(error) {
      setServerError("Connection error. Please try again.");
    } finally {
      hideLoader();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.simpleHeader}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
          disabled={loading}
        >
          <Ionicons name="arrow-back" size={24} color="#1F1F1F" />
        </TouchableOpacity>

        <AppText style={styles.simpleHeaderTitle}>
          {type === 'change_password' ? 'Verify Password' : 'Verify Email'}
        </AppText>
      </View>

      <View style={styles.container}>
        <AnimatedWrapper index={0} style={styles.content}>
          <AppText style={styles.title}>Check your email</AppText>
          <AppText style={styles.subHeader}>
            We've sent a 6-digit verification code to{"\n"}
            <AppText style={styles.emailText}>{email}</AppText>
          </AppText>

          <View style={styles.otpContainer}>
            <OTPInput 
              length={6} 
              onComplete={handleOtpComplete} 
              error={!!serverError} 
            />
          </View>

          {serverError && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <AppText style={styles.errorText}>{serverError}</AppText>
            </View>
          )}

          <View style={styles.footer}>
            <AppButton 
              title="Verify & Complete"
              onPress={handleVerify} 
              disabled={loading || otp.length < 6}
              loading={loading}
            />
          </View>
        </AnimatedWrapper>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  simpleHeader: { 
    height: 60,
    flexDirection: 'row',
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#D1D5DB', 
    position: 'relative', 
  },
  backButton: {
    position: 'absolute',
    left: 15,
    height: '100%',
    justifyContent: 'center',
    paddingRight: 20, 
    zIndex: 10,
  },
  simpleHeaderTitle: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#1F1F1F' 
  },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  content: { alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '900', color: '#1F1F1F', marginBottom: 10 },
  subHeader: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 40 },
  emailText: { color: '#42756C', fontWeight: '700' }, 
  otpContainer: { marginBottom: 20 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 20 },
  errorText: { color: '#EF4444', fontSize: 13, fontWeight: '500' }, 
  footer: { width: '100%' },
});