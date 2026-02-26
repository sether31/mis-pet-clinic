import React, { useState } from 'react';
import { StyleSheet, View, TextInput, Keyboard, TouchableOpacity, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

export default function ResetPassword() {
  const router = useRouter();
  const { platformData } = usePlatform();
  const { user_id } = useLocalSearchParams();
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState({});

  const getWrapperStyle = (name) => {
    if (errors[name]) return styles.inputErrorBorder;
    if (form[name] && !errors[name]) return styles.inputSuccessBorder;
    return null;
  };

  const validateField = (name, value, currentForm = form) => {
    let error = '';
    
    if (!value.trim()) {
      error = `${name === 'password' ? 'Password' : 'Confirm Password'} is required`;
    } else if (name === 'password') {
      if (value.length < 6) error = "Minimum 6 characters required";
    } else if (name === 'confirm') {
      if (value !== currentForm.password) error = "Passwords do not match";
    }

    setErrors(prev => ({ ...prev, [name]: error }));
    return error;
  };

  const handleReset = async () => {
    Keyboard.dismiss();
    
    // Final validation check
    const pError = validateField('password', form.password);
    const cError = validateField('confirm', form.confirm);

    if (pError || cError) {
      Toast.show({ 
        type: 'error', 
        text1: 'Please fill in all required inputs correctly.' 
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password-final-mobile.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id, password: form.password }),
      });
      const data = await response.json();

      if (data.success) {
        Toast.show({ type: 'success', text1: 'Success', text2: 'Password updated! Please login.' });
        router.replace('/Login');
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: data.message });
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Network Error', text2: 'Server is unreachable' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
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
          <AppText style={styles.title}>New Password</AppText>
          <AppText style={styles.subtitle}>Create a strong password for your account.</AppText>
        </AnimatedWrapper>

        <View style={{ marginTop: 20 }}>
          {/* New Password Input */}
          <AnimatedWrapper index={1} style={styles.inputGroup}>
            <AppText style={styles.label}>
                New Password <AppText style={{color: '#EF4444'}}>*</AppText>
            </AppText>
            <View style={[styles.inputWrapper, getWrapperStyle('password')]}>
              <Ionicons name="lock-closed-outline" size={20} color={errors.password ? '#EF4444' : '#9CA3AF'} />
              <TextInput 
                style={styles.input} 
                placeholder="Min 6 characters" 
                secureTextEntry={!showPassword} 
                onChangeText={(t) => { 
                  const newForm = {...form, password: t};
                  setForm(newForm);
                  validateField('password', t, newForm);
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

          {/* Confirm Password Input */}
          <AnimatedWrapper index={2} style={styles.inputGroup}>
            <AppText style={styles.label}>
                Confirm Password <AppText style={{color: '#EF4444'}}>*</AppText>
            </AppText>
            <View style={[styles.inputWrapper, getWrapperStyle('confirm')]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={errors.confirm ? '#EF4444' : '#9CA3AF'} />
              <TextInput 
                style={styles.input} 
                placeholder="Re-type new password" 
                secureTextEntry={!showPassword} 
                onChangeText={(t) => { 
                  const newForm = {...form, confirm: t};
                  setForm(newForm);
                  validateField('confirm', t, newForm);
                }}
              />
            </View>
            {errors.confirm && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={14} color="#EF4444" />
                <AppText style={styles.errorText}>{errors.confirm}</AppText>
              </View>
            )}
          </AnimatedWrapper>
        </View>

        <AnimatedWrapper index={3} style={{ marginTop: 20 }}>
          <AppButton title="Update Password" onPress={handleReset} loading={loading} />
          
          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.replace('/Login')}>
            <AppText style={styles.cancelText}>Cancel and return to Login</AppText>
          </TouchableOpacity>
        </AnimatedWrapper>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg50 },
  container: { flex: 1, paddingHorizontal: 28, paddingTop: 40 },
  headerContainer: { alignItems: 'center', marginBottom: 20 },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logoWrapper: {
    width: 60, height: 60, backgroundColor: Colors.white, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginRight: 4
  },
  logo: { width: 40, height: 40, borderRadius: 12, resizeMode: 'contain' },
  brandName: { fontSize: 26, fontWeight: '900', color: Colors.primary, flexShrink: 1 },
  title: { fontSize: 28, fontWeight: '900', color: '#111827' },
  subtitle: { fontSize: 15, color: '#6B7280', marginTop: 8, textAlign: 'center' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#374151', marginLeft: 4 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    borderRadius: 12, borderWidth: 1, borderColor: '#D1D5DB', 
    paddingHorizontal: 16, height: 56, gap: 12
  },
  input: { flex: 1, fontSize: 16, color: '#111827' },
  eyeIcon: { padding: 4 },
  inputErrorBorder: { borderColor: '#EF4444', borderWidth: 1.5 },
  inputSuccessBorder: { borderColor: '#10B981', borderWidth: 1.5 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4, marginLeft: 4 },
  errorText: { color: '#EF4444', fontSize: 12, fontWeight: '500', includeFontPadding: false, lineHeight: 14 },
  cancelBtn: { marginTop: 20, alignItems: 'center' },
  cancelText: { color: '#6B7280', fontSize: 14, fontWeight: '600' }
});