import { View, ActivityIndicator, StyleSheet, Modal } from 'react-native';
import AppText from './AppText';
import { Colors } from '../constants/Color';

export default function FullScreenLoader({ message, visible }) {
  return (
    <Modal transparent={true} animationType="fade" visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <AppText style={styles.message}>{message}</AppText>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderBox: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 160,
  },
  message: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  }
});