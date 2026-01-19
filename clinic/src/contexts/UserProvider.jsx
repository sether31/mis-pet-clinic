import { createContext, useEffect, useState } from "react";
// utils
import { validRoleToken } from "../utils/validRoleToken";
import { authFetch } from "../utils/authFetch";

export const UserContext = createContext();
const API_URL = import.meta.env.VITE_API_URL;

export default function UserProvider({ children }) {
  const [user, setUser] = useState(() => validRoleToken());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncUser = async () => {
      const token = localStorage.getItem('access_token');
      if(!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const response = await authFetch(`${API_URL}/api/clinic/general/get-updated-user-data.php`);
        if(response.success) {
          setUser(response.user); 
        } else {
          setUser(null);
        }
      } catch(err) {
        console.error("Getting new data failed. fallback to token.");
      } finally {
        setLoading(false);
      }
    };

    syncUser();
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, loading }}>
      {children}
    </UserContext.Provider>
  );
}