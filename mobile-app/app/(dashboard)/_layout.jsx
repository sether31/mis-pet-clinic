import { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Redirect, Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { validRoleToken } from '../../utils/auth'; 
import { Colors } from '../../constants/Color';

export default function DashboardLayout() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    const checkSession = async () => {   
      // Strictly checking for pet_owner role
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

  // Show a nice loader while checking the token
  if (isChecking) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Kick out unauthorized users
  if(!isAllowed) {
    return <Redirect href="/Login" />;
  }

  return (
    <Tabs 
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: '#9CA3AF',
        headerShown: false, 
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6',
          height: 65,
          paddingBottom: 10,
          paddingTop: 10,
          elevation: 5, 
          shadowColor: '#000', 
          shadowOpacity: 0.05,
          shadowRadius: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 2,
        }
      }}
    >
      <Tabs.Screen
        name="Home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
          ),
        }}
      />
      
      {/* pet */}
      <Tabs.Screen
        name="pets"
        options={{
          title: 'My Pets',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "paw" : "paw-outline"} size={24} color={color} />
          ),
        }}
      />

      {/* clinics */}
      <Tabs.Screen
        name="clinics"
        options={{
          title: 'Clinics',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "search" : "search-outline"} size={24} color={color} />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.replace('/(dashboard)/clinics');
          },
        }}
      />

      {/* appointments / activity */}
      <Tabs.Screen
        name="activity" 
        options={{
          title: 'My Activity', 
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "receipt" : "receipt-outline"} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loaderContainer: { 
    flex: 1, 
    backgroundColor: Colors.bg50, 
    justifyContent: 'center', 
    alignItems: 'center' 
  }
});