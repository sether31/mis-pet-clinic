import React, { createContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { validRoleToken, authFetch } from '../utils/auth';

export const UserContext = createContext();
const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const syncUser = async () => {
    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync('access_token');
      
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Check if token is locally valid for Pet Owner (Role 7)
      const decoded = await validRoleToken(['pet_owner']);
      if (!decoded) {
        setUser(null);
        setLoading(false);
        return;
      }

      // get data
      const response = await authFetch(`${API_URL}/api/pet-owner/get-user-data.php`);
      
      if(response && response.success) {
        setUser(response.user);
        
        if(response.new_token) {
          await SecureStore.setItemAsync('access_token', response.new_token);
        }
      } else {
        await SecureStore.deleteItemAsync('access_token');
        setUser(null);
      }
    } catch (err) {
      console.error("Server error or network failure.", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncUser();
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, loading, refreshUser: syncUser }}>
      {children}
    </UserContext.Provider>
  );
}