import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from '../../../../components/AppText';
import { Colors } from '../../../../constants/Color';
import { displayDate } from '../../../../utils/dateFormatter';
import AnimatedWrapper from '../../../../components/AnimatedWrapper'; 

export default function MedicalRecordsList({ records, petName, onRecordPress }) {
  
  // Format the text inside the badge
  const formatRecordType = (type) => {
    if (!type) return 'MEDICAL';
    return type.replace(/_/g, ' ').toUpperCase();
  };

  const getBadgeColor = (type) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('non')) return '#6B7280'; 
    return Colors.primary; 
  };

  const getRecordIcon = (type) => {
    const t = type?.toLowerCase() || '';
    if(t.includes('non')) {
      return 'paw'; 
    }
    return 'fitness';
  };

  if (!records || records.length === 0) {
    return (
      <View style={styles.recordsContainer}>
        <AnimatedWrapper index={1}>
          <View style={styles.emptyRecordsContainer}>
            <View style={styles.emptyRecordsIcon}>
              <Ionicons name="paw" size={40} color="#6B7280" />
            </View>
            <AppText style={styles.emptyRecordsTitle}>No Medical Records</AppText>
            <AppText style={styles.emptyRecordsSubtitle}>
              There are no vet visits or medical records for {petName} yet.
            </AppText>
          </View>
        </AnimatedWrapper>
      </View>
    );
  }

  return (
    <View style={styles.recordsContainer}>
      {records.map((record, index) => (
        <AnimatedWrapper key={record.medical_id || index} index={index + 1}>
          <Pressable 
            onPress={() => onRecordPress(record.medical_id)}
            style={({ pressed }) => [
              styles.recordCard, 
              { borderLeftColor: pressed ? Colors.primary : getBadgeColor(record.record_type) },
              pressed && styles.recordCardPressed 
            ]}
          >
            {({ pressed }) => (
              <View style={styles.cardLayout}>
                
                {/* Main Content Area */}
                <View style={styles.cardMain}>
                  {/* Dynamic Icon, Service Name, & Status Badge */}
                  <View style={styles.recordHeader}>
                    <View style={styles.titleRow}>
                      <Ionicons 
                        name={getRecordIcon(record.record_type)} 
                        size={18} 
                        color={getBadgeColor(record.record_type)} 
                        style={{ marginRight: 8 }} 
                      />
                      
                      <AppText style={styles.recordType} numberOfLines={1}>
                        {record.service_name_at_time}
                      </AppText>
                    </View>
                    
                    {/* The Status Badge */}
                    <View style={[styles.badge, { backgroundColor: getBadgeColor(record.record_type) }]}>
                      <AppText style={styles.badgeText}>{formatRecordType(record.record_type)}</AppText>
                    </View>
                  </View>

                  {/* Date & Diagnosis */}
                  <AppText style={styles.recordDate}>{displayDate(record.record_date)}</AppText>
                  
                  <AppText style={styles.recordDiagnosis} numberOfLines={2}>
                    {record.diagnosis || "No diagnosis details provided."}
                  </AppText>
                </View>

                {/* Chevron turns primary on press */}
                <Ionicons 
                  name="chevron-forward" 
                  size={24} 
                  color={pressed ? Colors.primary : "#D1D5DB"} 
                />
                
              </View>
            )}
          </Pressable>
        </AnimatedWrapper>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  recordsContainer: { paddingHorizontal: 20, paddingTop: 20 },
  
  emptyRecordsContainer: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 40, 
    backgroundColor: Colors.white, 
    borderRadius: 16, 
    borderStyle: 'dashed', 
    borderWidth: 2, 
    borderColor: '#6B7280' 
  },
  emptyRecordsIcon: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: '#F9FAFB', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 16 
  },
  emptyRecordsTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptyRecordsSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', paddingHorizontal: 30, lineHeight: 22, textTransform: 'capitalize' },
  
  recordCard: { 
    backgroundColor: Colors.white, 
    padding: 16, 
    borderRadius: 8,
    marginBottom: 16, 
    borderLeftWidth: 4, 
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB', 
  },
  
  recordCardPressed: {
    borderColor: Colors.primary,
    backgroundColor: '#F9FAFB',
  },

  cardLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardMain: {
    flex: 1,
    paddingRight: 12, 
  },
  
  recordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  
  recordType: { fontSize: 16, fontWeight: '800', color: '#111827', flexShrink: 1 },
  
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '800', color: Colors.white, letterSpacing: 0.5 },
  
  recordDate: { fontSize: 13, color: '#6B7280', fontWeight: '600', marginBottom: 8 },
  recordDiagnosis: { fontSize: 14, color: '#4B5563', lineHeight: 22 },
});