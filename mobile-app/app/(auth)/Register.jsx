import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, ScrollView, Keyboard, Image } from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePlatform } from '../../context/PlatformProvider';
import { Colors } from '../../constants/Color';
// components
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import AnimatedWrapper from '../../components/AnimatedWrapper'; 

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function Register() {
  const router = useRouter();
  const { platformData, refreshPlatform } = usePlatform();
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', password: '', confirmPassword: ''
  });
  const [errors, setErrors] = useState({});

  // Helper to render the Error with Icon
  const renderError = (error) => {
    if (!error) return null;
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={14} color="#EF4444" />
        <AppText style={styles.errorText}>{error}</AppText>
      </View>
    );
  };

  const getWrapperStyle = (name) => {
    if (errors[name]) return styles.inputErrorBorder;
    if (form[name] && !errors[name]) return styles.inputSuccessBorder;
    return null;
  };

  const validateField = (name, value, labelName) => {
    let error = '';
    if (!value.trim()) {
      error = `${labelName} is required`; 
    } else {
      if (name === 'email' && !/\S+@\S+\.\S+/.test(value)) error = 'Please enter a valid email address';
      if (name === 'confirmPassword' && value !== form.password) error = 'Passwords do not match';
      if (name === 'password' && value.length < 6) error = 'Minimum 6 characters required';
    }
    
    setErrors(prev => ({ ...prev, [name]: error }));
    return error;
  };

  const handleChange = (name, value, labelName) => {
    setForm(prev => ({ ...prev, [name]: value }));
    validateField(name, value, labelName);
  };

  const validateForm = () => {
    let isValid = true;
    let newErrors = {};

    const fieldMapping = {
      first_name: 'First Name',
      last_name: 'Last Name',
      email: 'Email Address',
      password: 'Password',
      confirmPassword: 'Confirm Password'
    };

    Object.keys(form).forEach(key => {
      const error = validateField(key, form[key], fieldMapping[key]);
      if (error) {
        newErrors[key] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSendOTP = async () => {
    Keyboard.dismiss();

    if (!validateForm()) {
      Toast.show({ type: 'error', text1: 'Please fill all required inputs.' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/register-mobile.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, role_id: 7 }),
      });

      if (response.status === 503) {
        refreshPlatform('maintenance'); 
        return; 
      }
      
      const data = await response.json();
      
      if(data.success) {
        Toast.show({ type: 'info', text1: 'An OTP has been sent to your email.' });
        router.push({ 
          pathname: '/VerifyOTP', 
          params: { 
            email: form.email, 
            temp_id: data.temp_user_id, 
            userData: JSON.stringify(form),
            type: 'register' 
          } 
        });
      } else {
        if (data.message.toLowerCase().includes('email')) {
          setErrors(prev => ({ ...prev, email: data.message }));
        }
        Toast.show({ type: 'error', text1: 'Registration Failed', text2: data.message });
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Network Error', text2: 'Server is unreachable' });
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        
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
          <AppText style={styles.subHeader}>Create an account to get started.</AppText>
        </AnimatedWrapper>

        {/* Form Section */}
        <View style={styles.formContainer}>
          <AnimatedWrapper index={1} style={styles.row}>
            {/* First Name */}
            <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
              <AppText style={styles.label}>First Name <AppText style={styles.requiredAsterisk}>*</AppText></AppText>
              <View style={[styles.inputWrapper, getWrapperStyle('first_name')]}>
                <Ionicons name="person-outline" size={20} color={errors.first_name ? '#EF4444' : '#9CA3AF'} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="John" 
                  placeholderTextColor="#9CA3AF"
                  onChangeText={t => handleChange('first_name', t, 'First Name')} 
                  value={form.first_name}
                />
              </View>
              {renderError(errors.first_name)}
            </View>

            {/* Last Name */}
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <AppText style={styles.label}>Last Name <AppText style={styles.requiredAsterisk}>*</AppText></AppText>
              <View style={[styles.inputWrapper, getWrapperStyle('last_name')]}>
                <Ionicons name="person-outline" size={20} color={errors.last_name ? '#EF4444' : '#9CA3AF'} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="Doe" 
                  placeholderTextColor="#9CA3AF"
                  onChangeText={t => handleChange('last_name', t, 'Last Name')} 
                  value={form.last_name}
                />
              </View>
              {renderError(errors.last_name)}
            </View>
          </AnimatedWrapper>

          {/* Email */}
          <AnimatedWrapper index={2} style={styles.inputGroup}>
            <AppText style={styles.label}>Email Address <AppText style={styles.requiredAsterisk}>*</AppText></AppText>
            <View style={[styles.inputWrapper, getWrapperStyle('email')]}>
              <Ionicons name="mail-outline" size={20} color={errors.email ? '#EF4444' : '#9CA3AF'} style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="example@gmail.com" 
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address" 
                autoCapitalize="none" 
                onChangeText={t => handleChange('email', t, 'Email Address')} 
                value={form.email}
              />
            </View>
            {renderError(errors.email)}
          </AnimatedWrapper>

          {/* Password */}
          <AnimatedWrapper index={3} style={styles.inputGroup}>
            <AppText style={styles.label}>Password <AppText style={styles.requiredAsterisk}>*</AppText></AppText>
            <View style={[styles.inputWrapper, getWrapperStyle('password')]}>
              <Ionicons name="lock-closed-outline" size={20} color={errors.password ? '#EF4444' : '#9CA3AF'} style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="Min 6 characters" 
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword} 
                onChangeText={t => handleChange('password', t, 'Password')} 
                value={form.password}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            {renderError(errors.password)}
          </AnimatedWrapper>

          {/* Confirm Password */}
          <AnimatedWrapper index={4} style={styles.inputGroup}>
            <AppText style={styles.label}>Confirm Password <AppText style={styles.requiredAsterisk}>*</AppText></AppText>
            <View style={[styles.inputWrapper, getWrapperStyle('confirmPassword')]}>
              <Ionicons name="lock-closed-outline" size={20} color={errors.confirmPassword ? '#EF4444' : '#9CA3AF'} style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="Re-type password" 
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showConfirmPassword} 
                onChangeText={t => handleChange('confirmPassword', t, 'Confirm Password')} 
                value={form.confirmPassword}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            {renderError(errors.confirmPassword)}
          </AnimatedWrapper>

          {/* Button & Footer */}
          <AnimatedWrapper index={5}>
            <AppButton 
              title="Create Account" 
              onPress={handleSendOTP} 
              loading={loading} 
              style={{ marginTop: 20 }}
            />

            <View style={styles.footer}>
              <AppText style={styles.footerText}>Already have an account? </AppText>
              <TouchableOpacity onPress={() => router.replace('/Login')}>
                <AppText style={styles.link}>Sign in</AppText>
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
  headerContainer: { alignItems: 'center', marginBottom: 32 },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logoWrapper: {
    width: 60, height: 60, backgroundColor: Colors.white, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginRight: 4
  },
  logo: { width: 40, height: 40, borderRadius: 12, resizeMode: 'contain' },
  brandName: { fontSize: 26, fontWeight: '900', color: Colors.primary, flexShrink: 1 },
  subHeader: { fontSize: 15, color: '#6B7280', textAlign: 'center', paddingHorizontal: 20 },
  formContainer: { width: '100%' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginLeft: 4, color: '#374151' },
  requiredAsterisk: { color: '#EF4444' },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
    borderRadius: 12, borderWidth: 1, borderColor: '#D1D5DB', 
    paddingHorizontal: 16, height: 54,
  },
  inputErrorBorder: { borderColor: '#EF4444', borderWidth: 1.5 },
  inputSuccessBorder: { borderColor: '#10B981', borderWidth: 1.5 },
  errorContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 6, 
    marginLeft: 4, 
    gap: 2
  },
  errorText: { 
    color: '#EF4444', 
    fontSize: 12, 
    fontWeight: '500',
    includeFontPadding: false,
    lineHeight: 14 
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#111827', height: '100%' },
  eyeIcon: { padding: 8 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  footerText: { color: '#6B7280', fontSize: 15 },
  link: { color: Colors.primary, fontWeight: 'bold', fontSize: 15 },
});