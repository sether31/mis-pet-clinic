import React, { useRef, useState, useEffect } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Colors } from '../constants/Color';

export default function OTPInput({ length = 6, onComplete, error }) {
  const [otp, setOtp] = useState(new Array(length).fill(''));
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputs = useRef([]);

  useEffect(() => {
    if (error) {
      setOtp(new Array(length).fill(''));
      inputs.current[0]?.focus();
    }
  }, [error]);

  const handleChange = (text, index) => {
    const value = text.replace(/[^0-9]/g, ''); 
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < length - 1) {
      inputs.current[index + 1].focus();
    }

    if (newOtp.join('').length === length) {
      onComplete(newOtp.join(''));
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace') {
      const newOtp = [...otp];
      
      if (otp[index] !== '') {
        // Clear current input if it has value
        newOtp[index] = '';
        setOtp(newOtp);
      } else if (index > 0) {
        // If current is already empty, clear previous and move back
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputs.current[index - 1].focus();
      }
    }
  };

  return (
    <View style={styles.container}>
      {otp.map((_, index) => (
        <TextInput
          key={index}
          style={[
            styles.input,
            focusedIndex === index && styles.inputFocused,
            error && styles.inputErrorBorder
          ]}
          keyboardType="number-pad"
          maxLength={1}
          ref={(ref) => (inputs.current[index] = ref)}
          onChangeText={(text) => handleChange(text, index)}
          onKeyPress={(e) => handleKeyPress(e, index)}
          onFocus={() => setFocusedIndex(index)}
          value={otp[index]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginVertical: 20 },
  input: {
    width: 45,
    height: 55,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    backgroundColor: '#FFF'
  },
  inputFocused: { borderColor: Colors.primary, borderWidth: 2 },
  inputErrorBorder: { borderColor: '#EF4444', borderWidth: 2 },
});