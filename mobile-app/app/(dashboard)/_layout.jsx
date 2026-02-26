import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { validRoleToken } from '../../utils/auth'; 
import { Colors } from '../../constants/Color';

export default function DashboardLayout() {
  const [isChecking, setIsChecking] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    const checkSession = async () => {   
      const decoded = await validRoleToken(['pet_owner']); 
      
      if(decoded) {
        setIsAllowed(true);
      } else {
        setIsAllowed(false);
      }
      
      setIsChecking(false);
    };

    checkSession();
  }, []);

  if (isChecking) {
    return <View style={{ flex: 1, backgroundColor: Colors.bg50 }} />;
  }

  if(!isAllowed) {
    return <Redirect href="/Login" />;
  }

  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: Colors.primary,
      tabBarInactiveTintColor: 'gray',
      headerShown: true,
      tabBarStyle: { height: 60, paddingBottom: 10 }
    }}>
      <Tabs.Screen
        name="Home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="Profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}