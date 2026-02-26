import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';

// valid role token
export async function validRoleToken(allowedRoles = ['pet_owner']) {
  try {
    const token = await SecureStore.getItemAsync('access_token');
    if (!token) return null;

    const decoded = jwtDecode(token);
    const { exp, role } = decoded;

    // check if token is expired
    if(!exp || exp * 1000 < Date.now()) {
      await SecureStore.deleteItemAsync('access_token');
      return null;
    }

    if(allowedRoles.length > 0 && !allowedRoles.includes(role)) {
      return null;
    }

    return decoded;
  } catch (error) {
    await SecureStore.deleteItemAsync('access_token');
    return null;
  }
}



// auth fetch
export const authFetch = async (url, options = {}, allowedRoles = ['pet_owner']) => {
  const decodedToken = await validRoleToken(allowedRoles);

  if (!decodedToken) {
    router.replace('/Login');
    return { error: 'Unauthorized', status: 401 };
  }

  const token = await SecureStore.getItemAsync("access_token");
  
  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url, { ...options, headers });

    if(response.status === 401 || response.status === 403) {
      await SecureStore.deleteItemAsync('access_token');
      Toast.show({
        type: 'error',
        text1: 'Access Denied',
        text2: 'Your session has expired or been revoked.'
      });

      router.replace('/Login');
      return { error: response.status };
    }

    return await response.json();
  } catch(err) {
    console.error("Network Error:", err);
    throw err;
  }
};