import { createContext, useEffect, useState } from "react";
import { validRoleToken } from "../utils/validRoleToken";
import { authFetch } from "../utils/authFetch";

export const UserContext = createContext();
const API_URL = import.meta.env.VITE_API_URL;

export default function UserProvider({ children }) {
  const [user, setUser] = useState(() => validRoleToken(['super_admin']));
  const [loading, setLoading] = useState(true);


  const syncUser = async () => {
    const token = sessionStorage.getItem('access_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await authFetch(`${API_URL}/api/super-admin/auth/get-super-admin-data.php`);
      
      if(response.success) {
        setUser(response.user);
        if(response.new_token) {
          sessionStorage.setItem('access_token', response.new_token);
        }
      } 
      else if(response.status === 401 || response.message === "Access revoked") {
        sessionStorage.removeItem('access_token');
        setUser(null);
      }
    } catch(err) {
      console.error("Server error or network failure. Falling back to local token.");
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