import { useState } from 'react';
import { StyleSheet, View, Keyboard, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store'; 
import { Colors } from '../../constants/Color';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import OTPInput from '../../components/OTPInput'; 

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function VerifyOTP() {
  const router = useRouter();
  const { email, temp_id, user_id, userData, type } = useLocalSearchParams();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null); 

  const handleOtpComplete = (code) => {
    setOtp(code);
    setServerError(null); 
  };

  const handleVerify = async () => {
    if (otp.length < 6) {
      setServerError("Please enter the full 6-digit code.");
      Toast.show({ type: 'error', text1: 'Incomplete Code' });
      return;
    }

    setLoading(true);
    setServerError(null);

    try {
      const isLogin = type === 'login';
      const endpoint = isLogin 
        ? `${API_URL}/api/auth/login-otp-mobile.php` 
        : `${API_URL}/api/auth/register-otp-mobile.php`;

      const body = isLogin 
        ? { otp, user_id } 
        : { otp, temp_user_id: temp_id, full_data: JSON.parse(userData) };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        if (isLogin) {
          if (data.access_token) await SecureStore.setItemAsync('access_token', data.access_token);
          Toast.show({ type: 'success', text1: 'Login Successful!' });
          router.replace('/(dashboard)/Home')
        } else {
          Toast.show({ type: 'success', text1: 'Account Verified!' });
          router.replace('/Login');
        }
      } else {
        setOtp(''); 
        setServerError(data.message || "Invalid verification code.");
        Toast.show({ type: 'error', text1: 'Verification Failed', text2: data.message });
      }
    } catch (error) {
      setServerError("Something went wrong");
      Toast.show({ type: 'error', text1: 'Something went wrong' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        <View style={styles.content}>
          <View style={styles.headerContainer}>
            <AppText style={styles.headerTitle}>Verify Account</AppText>
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

          {/* Inline Error Text matching your web style */}
          {serverError && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <AppText style={styles.errorText}>{serverError}</AppText>
            </View>
          )}

          <View style={styles.footerContainer}>
            <AppButton 
              title={type === 'login' ? 'Verify & Sign In' : 'Complete Registration'}
              onPress={handleVerify} 
              loading={loading}
            />

            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
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
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 }, // Centered the whole block
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