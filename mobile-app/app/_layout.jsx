import { Stack } from 'expo-router';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message'; 
import PlatformProvider from '../context/PlatformProvider';
import UIProvider from '../context/UIProvider';
import UserProvider from '../context/UserProvider';

const toastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#10B981' }}
      text1Style={{ fontSize: 16, fontWeight: '800' }}
      text2Style={{ fontSize: 14 }}
    />
  ),
  error: (props) => (
    <ErrorToast
      {...props}
      text2NumberOfLines={5} 
      style={{ 
        borderLeftColor: '#EF4444', 
        height: 'auto',     
        minHeight: 60, 
        paddingVertical: 15,  
        width: '90%'
      }}
      text1Style={{ fontSize: 16, fontWeight: '800' }}
      text2Style={{ fontSize: 13, color: '#4B5563', marginTop: 4 }}
    />
  )
};

export default function RootLayout() {
  return (
    <PlatformProvider>
      <UIProvider>
        <UserProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(dashboard)" />
          </Stack>
          
          <Toast position="top" config={toastConfig} />  
        </UserProvider>
      </UIProvider>
    </PlatformProvider>
  );
}