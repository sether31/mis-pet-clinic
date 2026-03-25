import React from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  TouchableOpacity, 
  Linking, 
  ScrollView 
} from 'react-native';
import { MotiView } from 'moti'; // Framer Motion's brother for React Native
import { MaterialCommunityIcons } from '@expo/vector-icons';
import notFoundPic from '../assets/images/notFound.gif';
import { Colors } from '../constants/Color';

export default function PlatformMaintenance({ message, platformEmail, contactPhone, onRefresh, reason }) {
  
  const handleEmail = () => {
    if (platformEmail) Linking.openURL(`mailto:${platformEmail}`);
  };

  const handlePhone = () => {
    if (contactPhone) {
      const cleanPhone = contactPhone.replace(/\s+/g, '');
      Linking.openURL(`tel:${cleanPhone}`);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <MotiView
        style={styles.content}
      >
        {/* Maintenance Alert Box */}
        {reason === 'maintenance' && (
          <View style={styles.alertBox}>
            <Text style={styles.alertTitle}>System Maintenance</Text>
            <Text style={styles.alertText}>Your last action was not saved because the system is being updated.</Text>
          </View>
        )}

        {/* Image Section */}
        <View style={styles.imageWrapper}>
          <Image 
            source={notFoundPic} 
            style={styles.image} 
            resizeMode="cover"
          />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>BRB</Text>
          </View>
        </View>

        <Text style={styles.header}>We'll be right back!</Text>
        
        <Text style={styles.description}>
          {message || "The platform is currently undergoing scheduled maintenance to improve our services."}
        </Text>

        {/* Contact Section */}
        <View style={styles.contactContainer}>
          {platformEmail && (
            <TouchableOpacity onPress={handleEmail} style={styles.contactLink}>
              <MaterialCommunityIcons name="email-outline" size={20} color="#6B7280" />
              <Text style={styles.linkText}>{platformEmail}</Text>
            </TouchableOpacity>
          )}
          
          {contactPhone && (
            <TouchableOpacity onPress={handlePhone} style={styles.contactLink}>
              <MaterialCommunityIcons name="phone-outline" size={20} color="#6B7280" />
              <Text style={styles.linkText}>{contactPhone}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Action Button */}
        <TouchableOpacity 
          onPress={onRefresh} // Pass your refreshPlatform function here
          style={styles.button}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Check Again</Text>
        </TouchableOpacity>
      </MotiView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F9FAFB', // Replace with your clr-bg-page
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  content: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  alertBox: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#F87171',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    width: '100%',
  },
  alertTitle: {
    color: '#B91C1C',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  alertText: {
    color: '#B91C1C',
    fontSize: 12,
  },
  imageWrapper: {
    marginBottom: 32,
    position: 'relative',
  },
  image: {
    width: 250,
    height: 180,
    borderRadius: 20,
    opacity: 0.8,
  },
  badge: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    backgroundColor: '#F97316',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    transform: [{ rotate: '12deg' }],
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  badgeText: {
    color: 'white',
    fontWeight: '900',
  },
  header: {
    fontSize: 32,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  contactContainer: {
    marginBottom: 40,
    gap: 12,
  },
  contactLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  linkText: {
    color: '#6B7280',
    textDecorationLine: 'underline',
    fontSize: 14,
  },
  button: {
    backgroundColor: Colors.primary, 
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});