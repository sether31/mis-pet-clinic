import { useEffect, useState } from 'react';
import { Stack, Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { validRoleToken } from '../../utils/auth';
import { Colors } from '../../constants/Color';

export default function AuthLayout() {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const decoded = await validRoleToken(); 
      
      if(decoded) {
        setIsAuthenticated(true);
      }
      
      setIsChecking(false);
    };

    checkSession();
  }, []);

  // show load
  if(isChecking) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // send back to dashboard
  if(isAuthenticated) {
    return <Redirect href="/(dashboard)/Home" />;
  }

  // if logout then logout
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" />
      <Stack.Screen name="Register" />
      <Stack.Screen name="VerifyOTP" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bg50,
  }
});