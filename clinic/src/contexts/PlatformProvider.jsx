import { createContext, useEffect, useState } from "react";
// components
import PlatformMaintenance from '../components/PlatformMaintenance';
import LoaderV2 from '../components/LoaderV2';

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
        console.error("Maintenance Check Failed:", err);
      } finally {
        setPlatformLoading(false);
      }
    };
    fetchPublicSettings();
  }, []);

  if(platformLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <LoaderV2 />
      </div>
    );
  }

  if(platformData?.is_maintenance === 1) {
    return (
      <PlatformMaintenance
        message={platformData.maintenance_message} 
        platformEmail={platformData.platform_email}
        contactPhone={platformData.contact_phone}
      />
    );
  }

  return (
    <PlatformContext.Provider value={{ platformData, platformLoading }}>
      {children}
    </PlatformContext.Provider>
  );
}