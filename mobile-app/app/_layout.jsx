import { Stack } from 'expo-router';
import Toast from 'react-native-toast-message';
import PlatformProvider from '../context/PlatformProvider';
import UIProvider from '../context/UIProvider';
import UserProvider from '../context/UserProvider';

export default function RootLayout() {
  return (
    <PlatformProvider>
      <UIProvider>
        <UserProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(dashboard)" />
          </Stack>
          {/* toast */}
          <Toast position="top" /> 
        </UserProvider>
      </UIProvider>
    </PlatformProvider>
  );
}