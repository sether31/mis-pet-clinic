import { Stack } from 'expo-router';

export default function ClinicsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="EditProfile" />
      <Stack.Screen name="ChangeEmail" />
      <Stack.Screen name="ChangePassword" />
      <Stack.Screen name="VerifyOTP" />
    </Stack>
  );
}