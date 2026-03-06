import { Stack } from 'expo-router';

export default function ClinicsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="product/[productId]" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="BookAppointment" />
    </Stack>
  );
}