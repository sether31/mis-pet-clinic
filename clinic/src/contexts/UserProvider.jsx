import { createContext, useEffect, useState } from "react";
// utils
import { validRoleToken } from "../utils/validRoleToken";

export const UserContext = createContext();

export default function UserProvider({ children }) {
  const [user, setUser] = useState(() => validRoleToken())

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if(!token) setUser(null);
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, loading }}>
      {children}
    </UserContext.Provider>
  );
}