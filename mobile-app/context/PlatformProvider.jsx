import { createContext, useState, useEffect, useContext } from 'react';
import { View, ActivityIndicator, StyleSheet, SafeAreaView } from 'react-native';
import PlatformMaintenance from '../components/PlatformMaintenance';

const PlatformContext = createContext();
const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function PlatformProvider({ children }) {
  const [platformData, setPlatformData] = useState(null);
  const [loading, setLoading] = useState(true);
  // NEW: State to track if we were kicked here by a 503
  const [maintenanceReason, setMaintenanceReason] = useState(null);

  const fetchPlatformSettings = async (reason = null) => {
    setLoading(true);
    // If a reason is passed (like 'maintenance'), save it
    if (reason) setMaintenanceReason(reason);
    
    try {
      const response = await fetch(`${API_URL}/api/public-data/get-logo.php`);
      const result = await response.json();
      
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (platformData?.is_maintenance === 1) {
    return (
      <SafeAreaView style={styles.fullScreen}>
        <PlatformMaintenance 
          message={platformData.maintenance_message}
          platformEmail={platformData.platform_email}
          contactPhone={platformData.contact_phone}
          onRefresh={() => fetchPlatformSettings()} // Refreshing clears the specific 'reason' alert
          reason={maintenanceReason} // <--- PASS THE REASON HERE
        />
      </SafeAreaView>
    );
  }

  return (
    <PlatformContext.Provider value={{ platformData, loading, refreshPlatform: fetchPlatformSettings }}>
      {children}
    </PlatformContext.Provider>
  );
};

export const usePlatform = () => useContext(PlatformContext);

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF'
  },
  fullScreen: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  }
});