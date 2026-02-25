import { Pressable, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Colors } from '../constants/Color';
import AppText from './AppText';

export default function AppButton({ 
  title, 
  onPress, 
  style, 
  textStyle, 
  loading = false, 
  disabled = false 
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        style,
        disabled && styles.disabled,
        pressed && styles.pressed 
      ]}
    >
      {loading ? (
        <ActivityIndicator color={Colors.white} />
      ) : (
        <AppText style={[styles.text, textStyle]}>{title}</AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { 
    backgroundColor: Colors.primary, 
    height: 56, 
    borderRadius: 16, 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }], 
  },
  disabled: {
    backgroundColor: Colors.border300, 
    elevation: 0,
    shadowOpacity: 0,
  },
  text: { 
    color: Colors.white, 
    fontWeight: 'bold', 
    fontSize: 18, 
    letterSpacing: 0.5 
  }
});