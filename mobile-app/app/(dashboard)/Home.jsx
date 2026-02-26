import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useUser } from '../../hooks/useUser';
import { Colors } from '../../constants/Color'; 
import Skeleton from '../../components/Skeleton';

export default function Home() {
  const { user, setUser, loading, refreshUser } = useUser();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync('access_token');
    
      setUser(null);

      router.replace('/Login');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const login = () => {
    router.replace('/Login')
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {loading ? (
          <View style={{ width: '100%', alignItems: 'center' }}>
            <Skeleton variant="title" />
            <Skeleton variant="subtitle" />
            <Skeleton variant="text" />
          </View>
        ) : (
          <>
            <Text style={styles.welcomeText}>Welcome back, {user?.fname}!</Text>
            <Text style={styles.emailText}>{user?.email}</Text>
            <Text style={styles.roleText}>Role: {user?.role}</Text>
          </>
        )}
      </View>

      <TouchableOpacity style={styles.refreshBtn} onPress={refreshUser}>
        <Text style={styles.refreshBtnText}>Refresh Data</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.refreshBtn} onPress={login}>
        <Text style={styles.refreshBtnText}>Go login</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#6B7280' },
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: Colors.bg50 },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  welcomeText: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  emailText: { fontSize: 16, color: '#6B7280', marginBottom: 4 },
  roleText: { fontSize: 14, color: Colors.primary, fontWeight: '600', textTransform: 'uppercase' },
  refreshBtn: {
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.primary
  },
  refreshBtnText: { color: Colors.primary, fontWeight: 'bold', fontSize: 16 },
  logoutBtn: {
    backgroundColor: '#EF4444',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});