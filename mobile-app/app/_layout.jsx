import { Stack } from 'expo-router';
import Toast from 'react-native-toast-message';
import { ActivityIndicator, View } from 'react-native';
import PlatformProvider, { usePlatform } from '../context/PlatformProvider';

function RootContent() {
  const { loading } = usePlatform();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <PlatformProvider>
      <RootContent />
      <Toast />
    </PlatformProvider>
  );
}