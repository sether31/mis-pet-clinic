import { useState } from 'react';
import { StyleSheet, View, Keyboard, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store'; 
import { Colors } from '../../constants/Color';

// Hooks
import { useUI } from '../../hooks/useUI';
import { useUser } from '../../hooks/useUser'; 

// Components
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import OTPInput from '../../components/OTPInput'; 

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function VerifyOTP() {
  const router = useRouter();
  const { email, temp_id, user_id, userData, type } = useLocalSearchParams();
  
  const { showLoader, hideLoader, loading } = useUI(); 
  const { setUser, refreshUser } = useUser(); 

  const [otp, setOtp] = useState('');
  const [serverError, setServerError] = useState(null); 

  const handleOtpComplete = (code) => {
    setOtp(code);
    setServerError(null); 
  };

  const handleVerify = async () => {
    if (otp.length < 6) {
      setServerError("Please enter the full 6-digit code.");
      return;
    }

    const loaderMsg = 
      type === 'login' ? 'Logging in...' : 
      type === 'password_reset' ? 'Verifying...' : 'Creating Account...';
    
    showLoader(loaderMsg);
    setServerError(null);

    try {
      // endpoint
      let endpoint = `${API_URL}/api/auth/register-otp-mobile.php`; 
      if (type === 'login') endpoint = `${API_URL}/api/auth/login-otp-mobile.php`;
      if (type === 'password_reset') endpoint = `${API_URL}/api/auth/verify-reset-otp.php`; 

      // Determine the body
      let body = { otp, temp_user_id: temp_id, full_data: userData ? JSON.parse(userData) : null };
      if (type === 'login' || type === 'password_reset') {
        body = { otp, user_id };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        if (type === 'login') {
          if (data.access_token) {
            await SecureStore.setItemAsync('access_token', data.access_token);
            if (data.user) setUser(data.user);
          }
          Toast.show({ type: 'success', text1: 'Login Successful!' });
          router.replace('/home');
        } 
        else if (type === 'password_reset') {
          Toast.show({ type: 'success', text1: 'Verified!', text2: 'Set your new password.' });
          router.replace({
            pathname: '/ResetPassword',
            params: { user_id }
          });
        } 
        else {
          Toast.show({ type: 'success', text1: 'Account Verified!' });
          router.replace('/Login');
        }
      } else {
        setOtp(''); 
        setServerError(data.message || "Invalid verification code.");
      }
    } catch(error) {
      setServerError("Something went wrong");
    } finally {
      hideLoader();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.headerContainer}>
            <AppText style={styles.headerTitle}>
              {type === 'login' && "Confirm Login"}
              {type === 'password_reset' && "Reset Password"}
              {type === 'register' && "Verify Account"}
            </AppText>
            <AppText style={styles.subHeader}>
              Enter the 6-digit code sent to{"\n"}
              <AppText style={styles.emailText}>{email}</AppText>
            </AppText>
          </View>

          <OTPInput 
            length={6} 
            onComplete={handleOtpComplete} 
            error={!!serverError} 
          />

          {serverError && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <AppText style={styles.errorText}>{serverError}</AppText>
            </View>
          )}

          <View style={styles.footerContainer}>
            <AppButton 
              title={
                type === 'login' ? 'Login' : 
                type === 'password_reset' ? 'Verify Code' : 
                'Complete Registration'
              }
              onPress={handleVerify} 
              disabled={loading} 
            />

            <TouchableOpacity style={styles.backButton} onPress={() => router.back()} disabled={loading}>
              <AppText style={styles.backButtonText}>Wrong email? Go back</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg50 },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 }, 
  content: { width: '100%', alignItems: 'center' },
  headerContainer: { alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#111827', marginBottom: 12 },
  subHeader: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
  emailText: { color: Colors.primary, fontWeight: '700' },
  errorContainer: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: -5, marginBottom: 15 },
  errorText: { color: '#EF4444', fontSize: 13, fontWeight: '500' },
  footerContainer: { width: '100%', marginTop: 20 },
  backButton: { marginTop: 20, alignItems: 'center' },
  backButtonText: { color: '#9CA3AF', fontSize: 14, fontWeight: '600' },
});