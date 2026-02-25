import { createContext, useState, useEffect, useContext } from 'react';

const PlatformContext = createContext();
const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function PlatformProvider({ children }) {
  const [platformData, setPlatformData] = useState({
    platform_name: 'Loading...',
    platform_logo: null,
  });
  const [loading, setLoading] = useState(true);

  const fetchPlatformSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/api/public-data/get-logo.php`);
      const rawText = await response.text();
      const result = JSON.parse(rawText);
      
      if(result.success) {
        setPlatformData(result.data);
      }
    } catch(error) {
      console.error("Platform fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatformSettings();
  }, []);

  return (
    <PlatformContext.Provider value={{ platformData, loading, refreshPlatform: fetchPlatformSettings }}>
      {children}
    </PlatformContext.Provider>
  );
};

export const usePlatform = () => useContext(PlatformContext);