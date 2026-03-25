import { useEffect, useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, ScrollView, Keyboard, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePlatform } from '../../context/PlatformProvider'; 
import { Colors } from '../../constants/Color';

// Components
import AppText from '../../components/AppText'; 
import AppButton from '../../components/AppButton';
import AnimatedWrapper from '../../components/AnimatedWrapper';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function Login() {
  const router = useRouter();
  const params = useLocalSearchParams(); 
  const { platformData, refreshPlatform } = usePlatform()
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({ email: null, password: null });

  useEffect(() => {
    if (params?.reason === 'maintenance') {
      refreshPlatform('maintenance');
    }
  }, [params?.reason]);

  const validateForm = () => {
    let isValid = true;
    let newErrors = { email: null, password: null };

    if (!form.email.trim()) {
      newErrors.email = 'Email Address is required';
      isValid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email)) {
        newErrors.email = 'Please enter a valid email address';
        isValid = false;
      }
    }

    if (!form.password) {
      newErrors.password = 'Password is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleLogin = async () => {
    Keyboard.dismiss();
    
    if (!validateForm()) {
      Toast.show({ 
        type: 'error', 
        text1: 'Please fill in all required inputs correctly.' 
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/login-mobile.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (response.status === 503) {
        refreshPlatform('maintenance'); 
        return; // Stop execution here
      }

      const data = await response.json();

      if(data.success) {
        Toast.show({ type: 'info', text1: 'Verification Required', text2: 'An OTP has been sent.' });
        router.push({
          pathname: '/VerifyOTP',
          params: { email: form.email, user_id: data.user_id, type: 'login' }
        });
      } else {
        const msg = data.message.toLowerCase();

        if(msg.includes('email') || msg.includes('user') || msg.includes('access')) {
          setErrors(prev => ({ ...prev, email: data.message }));
        } 
        else if(msg.includes('password')) {
          setErrors(prev => ({ ...prev, password: data.message }));
        } else {
          setErrors(prev => ({ ...prev, email: data.message }));
        }

        Toast.show({ type: 'error', text1: 'Login Failed', text2: data.message });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Network Error', text2: 'Server is unreachable' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        
        {/* Header */}
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
          <AppText style={styles.subHeader}>Welcome back! Please login to your account.</AppText>
        </AnimatedWrapper>

        <View style={styles.formContainer}>
          
          {/* Email Input */}
          <AnimatedWrapper index={1} style={styles.inputGroup}>
            <AppText style={styles.label}>Email Address <AppText style={{color: '#EF4444'}}>*</AppText></AppText>
            <View style={[styles.inputWrapper, errors.email && styles.inputErrorBorder]}>
              <Ionicons name="mail-outline" size={20} color={errors.email ? '#EF4444' : '#9CA3AF'} style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="example@gmail.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                value={form.email}
                onChangeText={t => {
                  setForm({...form, email: t});
                  if (errors.email) setErrors({...errors, email: null}); 
                }}
              />
            </View>
            {errors.email && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={14} color="#EF4444" />
                <AppText style={styles.errorText}>{errors.email}</AppText>
              </View>
            )}
          </AnimatedWrapper>

          {/* Password Input */}
          <AnimatedWrapper index={2} style={styles.inputGroup}>
            <AppText style={styles.label}>Password <AppText style={{color: '#EF4444'}}>*</AppText></AppText>
            <View style={[styles.inputWrapper, errors.password && styles.inputErrorBorder]}>
              <Ionicons name="lock-closed-outline" size={20} color={errors.password ? '#EF4444' : '#9CA3AF'} style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="Enter your password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                value={form.password}
                onChangeText={t => {
                  setForm({...form, password: t});
                  if (errors.password) setErrors({...errors, password: null}); 
                }}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            {errors.password && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={14} color="#EF4444" />
                <AppText style={styles.errorText}>{errors.password}</AppText>
              </View>
            )}
          </AnimatedWrapper>

          {/* Button & Footer */}
          <AnimatedWrapper index={3}>
            <TouchableOpacity style={styles.forgotBtn} onPress={() => router.push('/ForgotPassword')}>
              <AppText style={styles.forgotText}>Forgot Password?</AppText>
            </TouchableOpacity>

            <AppButton 
              title="Sign In" 
              onPress={handleLogin} 
              loading={loading} 
            />

            <View style={styles.footer}>
              <AppText style={styles.footerText}>Don't have an account? </AppText>
              <TouchableOpacity onPress={() => router.push('/Register')}>
                <AppText style={styles.link}>Sign up</AppText>
              </TouchableOpacity>
            </View>
          </AnimatedWrapper>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg50 },
  container: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 40 },
  headerContainer: { alignItems: 'center', marginBottom: 40 },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logoWrapper: {
    width: 60, height: 60, backgroundColor: Colors.white, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginRight: 4
  },
  logo: { width: 40, height: 40, borderRadius: 12, resizeMode: 'contain' },
  brandName: { fontSize: 26, fontWeight: '900', color: Colors.primary, flexShrink: 1 },
  subHeader: { fontSize: 15, color: '#6B7280', textAlign: 'center', paddingHorizontal: 20 },
  formContainer: { width: '100%' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginLeft: 4, color: '#374151' },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
    borderRadius: 12, borderWidth: 1, borderColor: '#D1D5DB',
    paddingHorizontal: 16, height: 54,
  },
  inputErrorBorder: { 
    borderColor: '#EF4444', 
    borderWidth: 1.5, 
  },
  errorText: { 
    color: '#EF4444', 
    fontSize: 12, 
    marginLeft: 4, 
    fontWeight: '500',
    includeFontPadding: false,
    lineHeight: 14 
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#111827', height: '100%' },
  eyeIcon: { padding: 8 },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 32 },
  forgotText: { color: Colors.primary, fontSize: 14, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  footerText: { color: '#6B7280', fontSize: 15 },
  link: { color: Colors.primary, fontWeight: 'bold', fontSize: 15 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginLeft: 4, gap: 2 },
});