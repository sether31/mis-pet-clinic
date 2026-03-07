import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

// File System and Sharing
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { Colors } from '../../../constants/Color';
import { authFetch } from '../../../utils/auth';
import { displayDate } from '../../../utils/dateFormatter';
import AppText from '../../../components/AppText';
import AnimatedWrapper from '../../../components/AnimatedWrapper';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const NO_IMAGE = require('../../../assets/images/no-image.jpg'); 

export default function MedicalRecordDetail() {
  const router = useRouter();
  const { recordId } = useLocalSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState(null);
  const [downloading, setDownloading] = useState(false); 

  useEffect(() => {
    if (recordId) {
      fetchRecordDetails();
    }
  }, [recordId]);

  const fetchRecordDetails = async () => {
    try {
      const data = await authFetch(`${API_URL}/api/pet-owner/pet/get-medical-record-details.php?record_id=${recordId}`);
      if (data?.success) {
        setRecord(data.data);
      } else {
        Toast.show({ type: 'error', text1: 'Could not load record details.' });
        router.back();
      }
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Something went wrong' });
    } finally {
      setLoading(false);
    }
  };

  const getMediaUrl = (path) => {
    if (!path || path.trim() === '') return null;
    if (path.startsWith('http')) return path; 
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${API_URL}/${cleanPath}`;
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'TBA';
    try {
      const [hour, minute] = timeString.split(':');
      const h = parseInt(hour, 10);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const formattedHour = h % 12 || 12;
      return `${formattedHour}:${minute} ${ampm}`;
    } catch(e) { return timeString; }
  };

  const handleDownload = async (filePath, displayType) => {
    if (downloading) return;
    const url = getMediaUrl(filePath);
    if (!url) return;

    setDownloading(true);
    Toast.show({ type: 'info', text1: `Downloading ${displayType}...` });

    try {
      const filename = filePath.split('/').pop() || 'downloaded_file';
      const localUri = FileSystem.documentDirectory + filename;

      const { uri } = await FileSystem.downloadAsync(url, localUri);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Toast.show({ type: 'success', text1: 'File downloaded to app data.' });
      }
    } catch (error) {
      console.error("Download Error:", error);
      Toast.show({ type: 'error', text1: 'Download failed', text2: 'Please check your connection.' });
    } finally {
      setDownloading(false);
    }
  };

  const formatRecordType = (type) => {
    if (!type) return 'MEDICAL RECORD';
    if(type === "unset") return 'UNRECORDED';
    return type.replace(/_/g, ' ').toUpperCase();
  };

  const getBadgeColor = (type) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('non')) return '#6B7280'; 
    return Colors.primary; 
  };

  const goToClinicProfile = () => {
    if (record?.branch_id) {
      router.push(`/(dashboard)/clinics/${record.branch_id}`);
    } else {
      Toast.show({ type: 'info', text1: 'Clinic profile not available.' });
    }
  };

  if(loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const hasAttachments = record?.med_image_1 || record?.med_image_2 || record?.med_doc_1 || record?.med_doc_2;
  const branchImageSource = getMediaUrl(record?.branch_image) ? { uri: getMediaUrl(record?.branch_image) } : NO_IMAGE;
  const vetImageSource = getMediaUrl(record?.vet_image) ? { uri: getMediaUrl(record?.vet_image) } : NO_IMAGE;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={26} color="#111827" />
        </TouchableOpacity>
        <AppText style={styles.headerTitle}>Visit Details</AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Branch Banner Image */}
        <AnimatedWrapper index={0}>
          <View style={styles.bannerContainer}>
            <Image source={branchImageSource} style={styles.bannerImage} />
            <View style={styles.bannerOverlay} />
            
            <View style={[styles.badgeContainer, { backgroundColor: getBadgeColor(record?.record_type) }]}>
              <AppText style={styles.badgeText}>{formatRecordType(record?.record_type)}</AppText>
            </View>
          </View>
        </AnimatedWrapper>
        
        {/* Top Summary Card */}
        <AnimatedWrapper index={1} style={styles.topCard}>
          <AppText style={styles.serviceName}>{record?.service_name_at_time}</AppText>
          
          <View style={styles.scheduleBox}>
            <AppText style={styles.scheduleLabel}>Appointment Schedule</AppText>
            
            <View style={styles.dateRow}>
              <Ionicons name="calendar" size={16} color={Colors.primary} />
              <AppText style={styles.dateText}>
                {displayDate(record?.appointment_date || record?.record_date)}
              </AppText>
            </View>
            
            <View style={styles.dateRow}>
              <Ionicons name="time" size={16} color={Colors.primary} />
              <AppText style={styles.dateText}>
                {record?.start_time ? `${formatTime(record.start_time)} - ${formatTime(record.end_time)}` : "Time not recorded"}
              </AppText>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          {/* Vet & Clinic Details */}
          <View style={styles.providerSection}>
            <Image source={vetImageSource} style={styles.vetAvatar} />
            <View style={styles.providerInfo}>
              <AppText style={styles.vetName}>
                Dr. {record?.vet_first_name} {record?.vet_last_name}
              </AppText>
              
              <TouchableOpacity style={styles.clinicRow} onPress={goToClinicProfile} activeOpacity={0.6}>
                <Ionicons name="business-outline" size={14} color={Colors.primary} />
                <AppText style={styles.clinicName}>{record?.branch_name}</AppText>
                <Ionicons name="chevron-forward" size={14} color={Colors.primary} style={{marginLeft: 2}} />
              </TouchableOpacity>
              
            </View>
          </View>
        </AnimatedWrapper>

        <View style={styles.detailsContainer}>
          
          <AnimatedWrapper index={2} style={styles.section}>
            <AppText style={styles.sectionTitle}>Diagnosis</AppText>
            <View style={styles.readOnlyBlock}>
              <AppText style={styles.readOnlyText}>
                {record?.diagnosis?.trim() ? record.diagnosis : "N/A"}
              </AppText>
            </View>
          </AnimatedWrapper>

          <AnimatedWrapper index={3} style={styles.section}>
            <AppText style={styles.sectionTitle}>Treatment & Prescriptions</AppText>
            <View style={styles.readOnlyBlock}>
              <AppText style={styles.readOnlyText}>
                {record?.treatment?.trim() ? record.treatment : "N/A"}
              </AppText>
            </View>
          </AnimatedWrapper>

          <AnimatedWrapper index={4} style={styles.section}>
            <AppText style={styles.sectionTitle}>Attachments</AppText>
            
            {!hasAttachments ? (
              <View style={styles.readOnlyBlock}>
                <AppText style={styles.readOnlyText}>N/A</AppText>
              </View>
            ) : (
              <>
                {(record?.med_image_1 || record?.med_image_2) && (
                  <View style={styles.imageGallery}>
                    {record?.med_image_1 && (
                      <TouchableOpacity style={styles.imageWrapper} activeOpacity={0.8} onPress={() => handleDownload(record.med_image_1, "Image")}>
                        <Image source={{ uri: getMediaUrl(record.med_image_1) }} style={styles.attachedImage} />
                        <View style={styles.downloadOverlay}>
                          <Ionicons name="download-outline" size={24} color="#FFF" />
                        </View>
                      </TouchableOpacity>
                    )}
                    {record?.med_image_2 && (
                      <TouchableOpacity style={styles.imageWrapper} activeOpacity={0.8} onPress={() => handleDownload(record.med_image_2, "Image")}>
                        <Image source={{ uri: getMediaUrl(record.med_image_2) }} style={styles.attachedImage} />
                        <View style={styles.downloadOverlay}>
                          <Ionicons name="download-outline" size={24} color="#FFF" />
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {(record?.med_doc_1 || record?.med_doc_2) && (
                  <View style={styles.docContainer}>
                    {record?.med_doc_1 && (
                      <TouchableOpacity style={styles.docBtn} onPress={() => handleDownload(record.med_doc_1, "Document")}>
                        <View style={styles.docIconWrapper}><Ionicons name="document-text" size={20} color={Colors.primary} /></View>
                        <AppText style={styles.docBtnText}>Download Document 1</AppText>
                        <View style={{ flex: 1 }} /><Ionicons name="download-outline" size={20} color="#9CA3AF" />
                      </TouchableOpacity>
                    )}
                    {record?.med_doc_2 && (
                      <TouchableOpacity style={styles.docBtn} onPress={() => handleDownload(record.med_doc_2, "Document")}>
                        <View style={styles.docIconWrapper}><Ionicons name="document-text" size={20} color={Colors.primary} /></View>
                        <AppText style={styles.docBtnText}>Download Document 2</AppText>
                        <View style={{ flex: 1 }} /><Ionicons name="download-outline" size={20} color="#9CA3AF" />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </>
            )}
          </AnimatedWrapper>

          {/* Timestamps */}
          <AnimatedWrapper index={5} style={styles.timestampContainer}>
            {record?.created_at && (
              <AppText style={styles.timestampText}>
                Record created at: {displayDate(record.created_at)}
              </AppText>
            )}
            {record?.updated_at && (
              <AppText style={styles.timestampText}>
                Last updated at: {displayDate(record.updated_at)}
              </AppText>
            )}
          </AnimatedWrapper>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg50 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: Colors.white, zIndex: 10 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  scrollContent: { paddingBottom: 60 },
  
  bannerContainer: { width: '100%', height: 160, position: 'relative' },
  bannerImage: { width: '100%', height: '100%', resizeMode: 'cover', backgroundColor: '#E5E7EB' },
  bannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
  
  badgeContainer: { position: 'absolute', top: 16, right: 16, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, elevation: 4 },
  badgeText: { color: Colors.white, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  topCard: { backgroundColor: Colors.white, padding: 24, borderRadius: 16, marginHorizontal: 20, marginTop: -40, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 2 },
  serviceName: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 16, textTransform: 'capitalize' },
  
  scheduleBox: { backgroundColor: '#F9FAFB', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', gap: 6 },
  scheduleLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', marginBottom: 2 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateText: { fontSize: 14, color: '#374151', fontWeight: '600' },
  
  divider: { height: 1, backgroundColor: '#F3F4F6', width: '100%', marginVertical: 16 },
  
  providerSection: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  vetAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  providerInfo: { flex: 1 },
  vetName: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 2, textTransform: 'capitalize' },
  
  clinicRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, paddingVertical: 4 },
  clinicName: { fontSize: 13, color: Colors.primary, fontWeight: '700', textTransform: 'capitalize' },

  detailsContainer: { paddingHorizontal: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 12, marginLeft: 2 },
  
  readOnlyBlock: { 
    backgroundColor: '#F9FAFB', 
    paddingHorizontal: 16, 
    paddingVertical: 16, 
    borderLeftWidth: 4, 
    borderLeftColor: Colors.primary 
  },
  readOnlyText: { fontSize: 15, color: '#374151', lineHeight: 24 },

  imageGallery: { flexDirection: 'row', gap: 12 },
  imageWrapper: { flex: 1, height: 140, borderRadius: 12, overflow: 'hidden', position: 'relative', backgroundColor: '#E5E7EB' },
  attachedImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  downloadOverlay: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  
  docContainer: { marginTop: 12, gap: 10 },
  docBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 12, borderRadius: 10, gap: 12 },
  docIconWrapper: { width: 36, height: 36, borderRadius: 8, backgroundColor: Colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  docBtnText: { fontSize: 15, color: '#111827', fontWeight: '600' },

  timestampContainer: { alignItems: 'center', marginTop: 10, paddingVertical: 20, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  timestampText: { fontSize: 12, color: '#9CA3AF', fontWeight: '500', marginBottom: 4 }
});