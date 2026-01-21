import { createContext, useEffect, useState } from "react";

export const PlatformContext = createContext();
const API_URL = import.meta.env.VITE_API_URL;

export default function PlatformProvider({ children }) {
  const [platformData, setPlatformData] = useState(null);
  const [platformLoading, setPlatformLoading] = useState(true);

  useEffect(() => {
    const fetchPublicSettings = async () => {
      try {
        const res = await fetch(`${API_URL}/api/public-data/get-logo.php`);
        const data = await res.json();
        if (data.success) setPlatformData(data.data);
      } catch (err) {
        console.error("Failed to load logo", err);
      } finally {
        setPlatformLoading(false);
      }
    };
    fetchPublicSettings();
  }, []);

  return (
    <PlatformContext.Provider value={{ platformData, platformLoading }}>
      {children}
    </PlatformContext.Provider>
  );
}