import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Keyboard, Image } from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Color';
import { usePlatform } from '../../context/PlatformProvider';

// Components
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import AnimatedWrapper from '../../components/AnimatedWrapper';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function ForgotPassword() {
  const router = useRouter();
  const { platformData, refreshPlatform } = usePlatform();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSendCode = async () => {
    Keyboard.dismiss();
    setError(null);

    // Basic Validation
    if (!email.trim()) {
      const msg = "Email is required";
      setError(msg);
      Toast.show({ type: 'error', text1: 'Validation Error', text2: msg });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const msg = "Please enter a valid email address";
      setError(msg);
      Toast.show({ type: 'error', text1: 'Validation Error', text2: msg });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password-mobile.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (response.status === 503) {
        refreshPlatform('maintenance'); 
        return; 
      }

      const data = await response.json();

      if (data.success) {
        Toast.show({ 
          type: 'info', 
          text1: 'OTP Sent', 
          text2: 'Check your inbox for the reset code.' 
        });
        
        router.push({
          pathname: '/VerifyOTP',
          params: { 
            email: email.trim(), 
            user_id: data.user_id, 
            type: 'password_reset' 
          }
        });
      } else {
        setError(data.message);
        Toast.show({ 
          type: 'error', 
          text1: 'Request Failed', 
          text2: data.message 
        });
      }
    } catch (e) {
      Toast.show({ 
        type: 'error', 
        text1: 'Network Error', 
        text2: 'Server is unreachable. Please try again later.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}> 
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>

        {/* Brand Section */}
        <AnimatedWrapper index={0} style={styles.headerContainer}>
          <View style={styles.brandRow}>
            <View style={styles.logoWrapper}>
              {platformData?.platform_logo ? (
                <Image source={{ uri: `${API_URL}/${platformData.platform_logo}` }} style={styles.logo} />
              ) : (
                <Ionicons name="paw" size={32} color={Colors.primary} />
              )}
            </View>
            <AppText style={styles.brandName}>{platformData?.platform_name || 'PetCare Clinic'}</AppText>
          </View>
          <AppText style={styles.title}>Forgot Password</AppText>
          <AppText style={styles.subtitle}>
            Enter your registered email below to receive a password reset code.
          </AppText>
        </AnimatedWrapper>

        <View style={styles.formContainer}>
          <AnimatedWrapper index={1} style={styles.inputGroup}>
            <AppText style={styles.label}>Email Address <AppText style={{color: '#EF4444'}}>*</AppText></AppText>
            <View style={[styles.inputWrapper, error && styles.inputErrorBorder]}>
              <Ionicons name="mail-outline" size={20} color={error ? '#EF4444' : '#9CA3AF'} />
              <TextInput 
                style={styles.input} 
                placeholder="example@gmail.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={(t) => { setEmail(t); setError(null); }}
              />
            </View>
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={14} color="#EF4444" />
                <AppText style={styles.errorText}>{error}</AppText>
              </View>
            )}
          </AnimatedWrapper>

          <AnimatedWrapper index={2} style={{ marginTop: 20 }}>
            <AppButton 
              title="Send Reset Code" 
              onPress={handleSendCode} 
              loading={loading} 
            />
          </AnimatedWrapper>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg50 },
  container: { flex: 1, paddingHorizontal: 28, paddingTop: 20 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', marginBottom: 10 },
  headerContainer: { alignItems: 'center', marginBottom: 30 },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logoWrapper: {
    width: 60, height: 60, backgroundColor: Colors.white, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginRight: 4
  },
  logo: { width: 40, height: 40, borderRadius: 12, resizeMode: 'contain' },
  brandName: { fontSize: 26, fontWeight: '900', color: Colors.primary, flexShrink: 1 },
  title: { fontSize: 28, fontWeight: '900', color: '#111827' },
  subtitle: { fontSize: 15, color: '#6B7280', textAlign: 'center', marginTop: 8, paddingHorizontal: 10 },
  formContainer: { width: '100%' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginLeft: 4, color: '#374151' },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    borderRadius: 12, borderWidth: 1, borderColor: '#D1D5DB', 
    paddingHorizontal: 16, height: 56, gap: 12
  },
  input: { flex: 1, fontSize: 16, color: '#111827' },
  inputErrorBorder: { borderColor: '#EF4444', borderWidth: 1.5 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4, marginLeft: 4 },
  errorText: { color: '#EF4444', fontSize: 12, fontWeight: '500', includeFontPadding: false, lineHeight: 14 },
});