import { Stack } from 'expo-router';
import Toast, { BaseToast, ErrorToast, InfoToast } from 'react-native-toast-message'; 
import * as NavigationBar from 'expo-navigation-bar';
import PlatformProvider from '../context/PlatformProvider';
import UIProvider from '../context/UIProvider';
import UserProvider from '../context/UserProvider';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';

const toastConfig = {
  // 👇 Success Toast (Green)
  success: (props) => (
    <BaseToast
      {...props}
      style={{ 
        borderLeftColor: '#10B981', 
        height: 'auto', 
        minHeight: 70, 
        paddingVertical: 12,
        width: '90%' 
      }}
      text1Style={{ fontSize: 16, fontWeight: '900', color: '#111827' }}
      text2Style={{ fontSize: 13, color: '#4B5563', marginTop: 2 }}
      text2NumberOfLines={3}
    />
  ),

  // 👇 Info Toast (Blue - Used for Deceased/Restore)
  info: (props) => (
    <InfoToast
      {...props}
      style={{ 
        borderLeftColor: '#3B82F6', 
        height: 'auto', 
        minHeight: 70, 
        paddingVertical: 12,
        width: '90%' 
      }}
      text1Style={{ fontSize: 16, fontWeight: '900', color: '#111827' }} 
      text2Style={{ fontSize: 13, color: '#4B5563', marginTop: 2 }}   
      text2NumberOfLines={3}
    />
  ),

  // 👇 Error Toast (Red)
  error: (props) => (
    <ErrorToast
      {...props}
      style={{ 
        borderLeftColor: '#EF4444', 
        height: 'auto', 
        minHeight: 70, 
        paddingVertical: 12,
        width: '90%' 
      }}
      text1Style={{ fontSize: 16, fontWeight: '900', color: '#111827' }}
      text2Style={{ fontSize: 13, color: '#4B5563', marginTop: 2 }}
      text2NumberOfLines={5} 
    />
  )
};

export default function RootLayout() {
  useEffect(() => {
    // This hides the bottom navigation bar (Back/Home/Recents)
    NavigationBar.setVisibilityAsync("hidden");
    
    // Optional: This makes the bar stay hidden even if the user swipes
    NavigationBar.setBehaviorAsync('inset-touch');
  }, []);

  return (
<<<<<<< HEAD
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor="transparent" translucent={true} />

      <PlatformProvider>
        <UIProvider>
          <UserProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(dashboard)" />
              <Stack.Screen name="+not-found" options={{ headerShown: false }} />
            </Stack>
            
            <Toast position="top" config={toastConfig} />  
          </UserProvider>
        </UIProvider>
      </PlatformProvider>
    </SafeAreaProvider>
=======
    <PlatformProvider>
      <UIProvider>
        <UserProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(dashboard)" />
            <Stack.Screen name="+not-found" options={{ headerShown: false }} />
          </Stack>
          
          <Toast position="top" config={toastConfig} />  
        </UserProvider>
      </UIProvider>
    </PlatformProvider>
>>>>>>> af2bbb1ccfe7552a60bb69af3f4e81879f82728a
  );
}