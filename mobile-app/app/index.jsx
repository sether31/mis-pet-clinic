import { Redirect } from 'expo-router';
import { useUser } from '../hooks/useUser';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '../constants/Color';


export default function Index() {
  const { user, loading } = useUser();

  if(loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (user) {
    return <Redirect href="/(dashboard)/home" />;
  } 

  return <Redirect href="/(auth)/Login" />;
}