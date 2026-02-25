import { Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/Color';

export default function AppText({ children, style, ...props }) {
  return (
    <Text style={[styles.defaultText, style]} {...props}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  defaultText: {
    color: Colors.dark, 
    fontSize: 14,
  }
});